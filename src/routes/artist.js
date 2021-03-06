const db = require('./../handlers/db/index');
const tables = require('../database/tableNames');
const respond = require('./../handlers/response');
const ger = require('../ger/');

const artistExpectedBodySchema = {
  type: 'object',
  properties: {
    name: {
      required: true,
      type: 'string',
    },
    description: {
      required: true,
      type: 'string',
    },
    genres: {
      required: true,
      type: 'array',
      items: {
        type: 'string',
      },
    },
    images: {
      required: true,
      type: 'array',
      items: {
        type: 'string',
      },
    },
  },
};

const getArtists = (req, res) => {
  db.artist.findAllArtists(req.query)
    .then(artists => respond.successfulArtistsFetch(artists, res))
    .catch(error => respond.internalServerError(error, res));
};

const newArtist = (req, res) => {
  if (!(req.file)) {
    req.file = { path: '' };
  }
  respond.validateRequestBody(req.body, artistExpectedBodySchema)
    .then(() => {
      req.body.images = req.file.path !== '' ? [process.env.BASE_URL + req.file.path.replace('public/', '')] : [''];
      db.artist.createNewArtistEntry(req.body)
        .then(artist => respond.successfulArtistCreation(artist, res))
        .catch(error => respond.internalServerError(error, res));
    })
    .catch(error => respond.invalidRequestBodyError(error, res));
};

const getArtist = (req, res) => {
  db.artist.findArtistWithId(req.params.id)
    .then(artist => {
      if (!respond.entryExists(req.params.id, artist, res)) return;
      respond.successfulArtistFetch(artist, res);
    })
    .catch(error => respond.internalServerError(error, res));
};

const updateArtist = (req, res) => {
  respond.validateRequestBody(req.body, artistExpectedBodySchema)
    .then(() => {
      db.general.findEntryWithId(tables.artists, req.params.id)
        .then(artist => {
          if (!respond.entryExists(req.params.id, artist, res)) return;
          db.artist.updateArtistEntry(req.body, req.params.id)
            .then(updatedArtist => respond.successfulArtistUpdate(updatedArtist, res))
            .catch(error => respond.internalServerError(error, res));
        })
        .catch(error => respond.internalServerError(error, res));
    })
    .catch(error => respond.invalidRequestBodyError(error, res));
};

const deleteArtist = (req, res) => {
  db.general.findEntryWithId(tables.artists, req.params.id)
    .then(artist => {
      if (!respond.entryExists(req.params.id, artist, res)) return;
      db.artist.deleteArtist(req.params.id)
        .then(() => respond.successfulArtistDeletion(res))
        .catch(error => respond.internalServerError(error, res));
    })
    .catch(error => respond.internalServerError(error, res));
};

const getFavoriteArtists = (req, res) => {
  db.artist.findUserFavorites(req.user.id)
    .then(artists => respond.successfulArtistsFetch(artists, res))
    .catch(error => respond.internalServerError(error, res));
};

const artistUnfollow = (req, res) => {
  db.artist.findArtistWithId(req.params.id)
    .then(artist => {
      if (!respond.entryExists(req.params.id, artist, res)) return;
      ger.events([{ namespace: 'artists', person: req.user.id, action: 'dislikes', thing: req.params.id, expires_at: '2025-06-06' }]);
      db.artist.unfollow(req.user.id, req.params.id)
        .then(() => respond.successfulArtistUnfollow(artist, res))
        .catch(error => respond.internalServerError(error, res));
    })
    .catch(error => respond.internalServerError(error, res));
};

const artistFollow = (req, res) => {
  db.artist.findArtistWithId(req.params.id)
    .then(artist => {
      if (!respond.entryExists(req.params.id, artist, res)) return;
      ger.events([{ namespace: 'artists', person: req.user.id, action: 'likes', thing: req.params.id, expires_at: '2025-06-06' }]);
      db.artist.follow(req.user.id, req.params.id)
        .then(() => respond.successfulArtistFollow(artist, res))
        .catch(error => respond.internalServerError(error, res));
    })
    .catch(error => respond.internalServerError(error, res));
};

const getTracks = (req, res) => {
  db.general.findEntryWithId(tables.artists, req.params.id)
    .then(artist => {
      if (!respond.entryExists(req.params.id, artist, res)) return;
      db.artist.getTracks(req.params.id)
        .then(tracks => respond.successfulTracksFetch(tracks, res))
        .catch(error => respond.internalServerError(error, res));
    })
    .catch(error => respond.internalServerError(error, res));
};

const getRecommendedArtists = (req, res) => {
  ger.recommendations_for_person('artists', req.user.id, {
    actions: { likes: 1 },
    filter_previous_actions: ['likes'],
  })
    .then(recommendations => {
      const recommendedIds = [];
      for (let i = 0, len = recommendations.recommendations.length; i < len; i += 1) {
        recommendedIds.push(recommendations.recommendations[i].thing);
      }
      if (recommendedIds.length !== 0) {
        db.artist.findArtistsWithIds(recommendedIds)
          .then(artists => respond.successfulArtistsFetch(artists, res))
          .catch(error => respond.internalServerError(error, res));
      } else {
        db.artist.findAllArtists(req.query)
          .then(artists => respond.successfulArtistsFetch(artists, res))
          .catch(error => respond.internalServerError(error, res));
      }
    });
};

module.exports = {
  getArtists,
  newArtist,
  getArtist,
  updateArtist,
  deleteArtist,
  getFavoriteArtists,
  artistUnfollow,
  artistFollow,
  getTracks,
  getRecommendedArtists,
};
