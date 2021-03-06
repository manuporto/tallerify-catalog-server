const logger = require('../../utils/logger');
const tables = require('../../database/tableNames');
const db = require('../../database/index');
const generalHandler = require('./generalHandler');
const artistTrackHandler = require('./artistTrackHandler');
const playlistTrackHandler = require('./playlistTrackHandler');

const NonExistentIdError = require('../../errors/NonExistentIdError');

const math = require('mathjs');

const _findAllTracks = () => db
  .select('tr.*',
    db.raw('to_json(array_agg(distinct ar.*)) as artists, to_json(array_agg(distinct al.*))::json->0 as album, avg(rating.rating) as popularity'))
  .from(`${tables.tracks} as tr`)
  .leftJoin(`${tables.albums} as al`, 'al.id', 'tr.album_id')
  .innerJoin(`${tables.artists_tracks} as art`, 'art.track_id', 'tr.id')
  .innerJoin(`${tables.artists} as ar`, 'ar.id', 'art.artist_id')
  .leftJoin(`${tables.tracks_rating} as rating`, 'rating.track_id', 'tr.id')
  .groupBy('tr.id');

const findAllTracks = queries => {
  logger.info('Finding tracks');
  // Ugly hack to return empty array if empty name query it's supplied
  // The normal behavior (knex) it's to return everything
  if (queries.name === '') return Promise.resolve([]);
  return (queries.name) ? _findAllTracks().where('tr.name', 'ilike', `%${queries.name}%`) : _findAllTracks();
};

const findTrackWithId = id => {
  logger.info('Finding track by id');
  return _findAllTracks().where('tr.id', id).first();
};

const findTracksWithIds = ids => {
  logger.info('Finding tracks with selected ids');
  return _findAllTracks().whereIn('tr.id', ids);
};

const findTracksWithAlbumId = albumId => {
  logger.info('Finding tracks with albums ids');
  return _findAllTracks().where('tr.album_id', albumId);
};

const findTracksWithAlbumsIds = albumsIds => {
  logger.info('Finding tracks with albums ids');
  return _findAllTracks().whereIn('tr.album_id', albumsIds);
};

const findArtists = body => db(tables.artists).whereIn('id', body.artists).then(artists => {
  if (artists.length < body.artists.length) {
    logger.warn(`Req artists: ${JSON.stringify(body.artists)} vs DB artists: ${JSON.stringify(artists)}`);
    return Promise.reject(new NonExistentIdError('Non existing artist.'));
  }
  return artists;
});

const findAlbum = body => db(tables.albums).where('id', body.albumId).first().then(album => {
  if (!album) {
    logger.warn(`Req album: ${JSON.stringify(body.albumId)} vs DB album: ${JSON.stringify(album)}`);
    return Promise.reject(new NonExistentIdError('Non existing album.'));
  }
  return album;
});

const createNewTrackEntry = body => {
  logger.debug(`Creating track with info: ${JSON.stringify(body, null, 4)}`);
  const track = {
    name: body.name,
    album_id: body.albumId,
  };
  const finders = [findArtists(body), findAlbum(body)];
  return Promise.all(finders)
    .then(() => generalHandler.createNewEntry(tables.tracks, track)
        .then(insertedTrack => {
          logger.debug(`Inserted track: ${JSON.stringify(insertedTrack, null, 4)}`);
          return artistTrackHandler.insertAssociations(insertedTrack[0].id, body.artists)
            .then(() => findTrackWithId(insertedTrack[0].id));
        }));
};

const updateTrackEntry = (body, id) => {
  logger.debug(`Updating track ${id}`);
  const track = {
    name: body.name,
    album_id: body.albumId,
  };
  const finders = [findArtists(body), findAlbum(body)];
  return Promise.all(finders)
    .then(() => generalHandler.updateEntryWithId(tables.tracks, id, track)
      .then(updatedTrack => {
        logger.debug(`Updated track: ${JSON.stringify(updatedTrack, null, 4)}`);
        return artistTrackHandler.updateAssociations(updatedTrack[0].id, body.artists)
          .then(() => findTrackWithId(updatedTrack[0].id));
      }));
};

const like = (userId, trackId) => {
  logger.debug(`User ${userId} liking track ${trackId}`);
  return db(tables.users_tracks).where({
    user_id: userId,
    track_id: trackId,
  })
    .then(result => {
      if (result.length) {
        logger.warn(`User ${userId} already liked track ${trackId}`);
        return;
      }
      logger.debug('Creating user-track association');
      return generalHandler.createNewEntry(tables.users_tracks, {
        user_id: userId,
        track_id: trackId,
      });
    });
};

const dislike = (userId, trackId) => {
  logger.debug(`User ${userId} disliking track ${trackId}`);
  return db(tables.users_tracks).where({
    user_id: userId,
    track_id: trackId,
  }).del();
};

const findUserFavorites = userId => {
  logger.debug('Searching for track favorites');
  return db(tables.users_tracks).select('track_id').where({
    user_id: userId,
  })
    .then(tracks => {
      const trackIds = tracks.map(track => track.track_id);
      logger.debug(`Liked track ids for user ${userId}: ${JSON.stringify(trackIds, null, 4)}`);
      return _findAllTracks().whereIn('tr.id', trackIds);
    });
};

const calculateRate = trackId => {
  logger.debug(`Calculating rating for track ${trackId}`);
  return db(tables.tracks_rating).select('rating').where({
    track_id: trackId,
  })
    .then(ratings => {
      logger.debug(`Ratings for track ${trackId}: ${JSON.stringify(ratings, null, 4)}`);
      if (!ratings.length) return 0;
      return math.mean(ratings.map(rating => rating.rating));
    });
};

const rate = (track, userId, rating) => {
  logger.info(`User ${userId} rating track ${track.id} with rate: ${rating}`);
  return db(tables.tracks_rating).where({
    user_id: userId,
    track_id: track.id,
  }).del()
    .then(() => {
      const entry = {
        user_id: userId,
        track_id: track.id,
        album_id: track.album_id,
        rating,
      };
      logger.info(`New rating table entry ${JSON.stringify(entry, null, 4)}`);
      return generalHandler.createNewEntry(tables.tracks_rating, entry);
    });
};

const updateAlbumId = (trackId, albumId) => {
  logger.debug(`Updating track ${trackId} albumId to ${albumId}`);
  return Promise.all([
    db(tables.tracks).where('id', trackId).update({ album_id: albumId }),
    db(tables.tracks_rating).where('track_id', trackId).update('album_id', albumId),
  ]);
};

const removeTracksFromAlbum = albumId => {
  logger.debug(`Removing tracks in album ${albumId}`);
  return db(tables.tracks).where('album_id', albumId).update({ album_id: -1 });
};

const deleteAlbumId = trackId => {
  logger.debug(`Leaving track ${trackId} orphan`);
  return updateAlbumId(trackId, -1);
};

const deleteRatingsOfTrack = trackId => {
  logger.debug(`Deleting track ${trackId} ratings`);
  return db(tables.tracks_rating).where('track_id', trackId).del();
};

const deleteTrackWithId = id => {
  logger.debug(`Deleting track ${id}`);
  const deleters = [
    generalHandler.deleteEntryWithId(tables.tracks, id),
    deleteRatingsOfTrack(id),
    artistTrackHandler.deleteAssociationsOfTrack(id),
    playlistTrackHandler.deleteAssociationsOfTrack(id),
  ];
  return Promise.all(deleters);
};

module.exports = {
  findAllTracks,
  findTrackWithId,
  findTracksWithIds,
  findTracksWithAlbumId,
  findTracksWithAlbumsIds,
  createNewTrackEntry,
  updateTrackEntry,
  like,
  dislike,
  findUserFavorites,
  calculateRate,
  rate,
  removeTracksFromAlbum,
  updateAlbumId,
  deleteAlbumId,
  deleteTrackWithId,
};
