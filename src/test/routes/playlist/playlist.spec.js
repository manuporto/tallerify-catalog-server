process.env.NODE_ENV = 'test';

const app = require('../../../app');
const db = require('../../../database/index');
const tables = require('../../../database/tableNames');
const dbHandler = require('../../../handlers/db/index');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const chai = require('chai');
const chaiHttp = require('chai-http');
const logger = require('../../../utils/logger');

chai.should();
chai.use(chaiHttp);

const config = require('./../../../config');
const constants = require('./playlist.constants.json');

const testToken = jwt.sign(constants.jwtTestUser, config.secret);

let validPlaylistId;
describe('Playlist', () => {
  beforeEach(done => {
    db.migrate.rollback()
      .then(() => {
        db.migrate.latest()
          .then(() => {
            dbHandler.general.createNewEntry(tables.users, constants.initialUser)
              .then(owner => {
                logger.info(`Tests user created: ${JSON.stringify(owner, null, 4)}`);
                const initialUserId = owner[0].id;
                dbHandler.artist.createNewArtistEntry(constants.initialArtist)
                  .then(artist => {
                    logger.info(`Tests artist created: ${JSON.stringify(artist, null, 4)}`);
                    const initialArtistId = artist[0].id;

                    const initialAlbum = constants.initialAlbum;
                    initialAlbum.artists = [initialArtistId];

                    dbHandler.album.createNewAlbumEntry(initialAlbum)
                      .then(album => {
                        logger.info(`Tests album created: ${JSON.stringify(album, null, 4)}`);
                        const initialAlbumId = album[0].id;

                        const initialTrackInPlaylist = constants.initialTrackInPlaylist;
                        initialTrackInPlaylist.albumId = initialAlbumId;
                        initialTrackInPlaylist.artists = [initialArtistId];

                        const initialTrack = constants.initialTrack;
                        initialTrack.albumId = initialAlbumId;
                        initialTrack.artists = [initialArtistId];

                        Promise.all([
                          dbHandler.track.createNewTrackEntry(initialTrackInPlaylist),
                          dbHandler.track.createNewTrackEntry(initialTrack),
                        ])
                          .then(tracks => {
                            logger.info(`Tests tracks created: ${JSON.stringify(tracks, null, 4)}`);
                            const initialTrackInPlaylistId = tracks[0][0].id;

                            const initialPlaylist = constants.initialPlaylist;
                            initialPlaylist.ownerId = initialUserId;
                            initialPlaylist.songs = [initialTrackInPlaylistId];

                            dbHandler.playlist.createNewPlaylistEntry(initialPlaylist)
                              .then(playlist => {
                                logger.info(`Tests playlist created: ${JSON.stringify(playlist, null, 4)}`);
                                validPlaylistId = playlist[0].id;
                                done();
                              })
                              .catch(error => {
                                logger.warn(`Test playlist creation error: ${error}`);
                                done(error);
                              });
                          })
                          .catch(error => {
                            logger.warn(`Test track creation error: ${error}`);
                            done(error);
                          });
                      })
                      .catch(error => {
                        logger.warn(`Test album creation error: ${error}`);
                        done(error);
                      });
                  })
                  .catch(error => {
                    logger.warn(`Test artist creation error: ${error}`);
                    done(error);
                  });
              })
              .catch(error => {
                logger.warn(`Test user creation error: ${error}`);
                done(error);
              });
          })
          .catch(error => done(error));
      });
  });

  afterEach(done => {
    db.migrate.rollback()
    .then(() => done());
  });

  describe('/GET playlists', () => {
    it('should return status code 200', done => {
      request(app)
        .get('/api/playlists')
        .set('Authorization', `Bearer ${testToken}`)
        .end((err, res) => {
          res.should.have.status(200);
          done();
        });
    });

    it('should return the expected body response when correct parameters are sent', done => {
      request(app)
        .get('/api/playlists')
        .set('Authorization', `Bearer ${testToken}`)
        .end((err, res) => {
          res.body.should.be.a('object');
          res.body.should.have.property('metadata');
          res.body.metadata.should.have.property('version');
          res.body.metadata.should.have.property('count');
          res.body.should.have.property('playlists');
          res.body.playlists.should.be.a('array');
          res.body.playlists.should.have.lengthOf(1);
          done();
        });
    });

    it('should return status code 401 if unauthorized', done => {
      request(app)
        .get('/api/playlists')
        .set('Authorization', 'Bearer UNAUTHORIZED')
        .end((err, res) => {
          res.should.have.status(401);
          done();
        });
    });
  });

  describe('/POST playlists', () => {
    it('should return status code 400 when parameters are missing', done => {
      request(app)
        .post('/api/playlists')
        .set('Authorization', `Bearer ${testToken}`)
        .send(constants.newPlaylistWithMissingAttributes)
        .end((err, res) => {
          res.should.have.status(400);
          done();
        });
    });

    it('should return status code 400 when parameters are invalid', done => {
      request(app)
        .post('/api/playlists')
        .set('Authorization', `Bearer ${testToken}`)
        .send(constants.invalidPlaylist)
        .end((err, res) => {
          res.should.have.status(400);
          done();
        });
    });

    it('should return status code 201 when correct parameters are sent', done => {
      request(app)
        .post('/api/playlists')
        .set('Authorization', `Bearer ${testToken}`)
        .send(constants.testPlaylist)
        .end((err, res) => {
          res.should.have.status(201);
          done();
        });
    });

    it('should return the expected body response when correct parameters are sent', done => {
      request(app)
        .post('/api/playlists')
        .set('Authorization', `Bearer ${testToken}`)
        .send(constants.testPlaylist)
        .end((err, res) => {
          res.body.should.be.a('object');
          res.body.should.have.property('id');
          res.body.should.have.property('name').eql(constants.testPlaylist.name);
          res.body.should.have.property('description').eql(constants.testPlaylist.description);
          res.body.should.have.property('href');
          // res.body.should.have.property('owner'); TODO
          // res.body.should.have.property('tracks'); TODO
          done();
        });
    });

    it('should return status code 401 if unauthorized', done => {
      request(app)
        .post('/api/playlists')
        .set('Authorization', 'Bearer UNAUTHORIZED')
        .send(constants.testPlaylist)
        .end((err, res) => {
          res.should.have.status(401);
          done();
        });
    });
  });

  describe('/GET playlists/{id}', () => {
    it('should return status code 200', done => {
      request(app)
        .get(`/api/tracks/${validPlaylistId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .end((err, res) => {
          res.should.have.status(200);
          done();
        });
    });

    it('should return playlist data', done => {
      request(app)
        .get(`/api/playlists/${validPlaylistId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .end((err, res) => {
          res.body.should.be.a('object');
          res.body.should.have.property('metadata');
          res.body.metadata.should.have.property('version');
          res.body.metadata.should.have.property('count');
          res.body.should.have.property('playlist');
          res.body.playlist.should.have.property('id').eql(validPlaylistId);
          res.body.playlist.should.have.property('name').eql(constants.initialPlaylist.name);
          res.body.playlist.should.have.property('description').eql(constants.initialPlaylist.description);
          res.body.playlist.should.have.property('href');
          // res.body.playlist.should.have.property('owner'); TODO
          // res.body.playlist.should.have.property('tracks'); TODO
          done();
        });
    });

    it('should return status code 404 if id does not match a track', done => {
      request(app)
        .get(`/api/playlists/${constants.invalidPlaylistId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .end((err, res) => {
          res.should.have.status(404);
          done();
        });
    });

    it('should return status code 401 if unauthorized', done => {
      request(app)
        .get(`/api/playlists/${constants.invalidPlaylistId}`)
        .set('Authorization', 'Bearer UNAUTHORIZED')
        .end((err, res) => {
          res.should.have.status(401);
          done();
        });
    });
  });

  describe('/PUT playlists/{id}', () => {
    it('should return status code 201 when correct parameters are sent', done => {
      request(app)
        .put(`/api/playlists/${validPlaylistId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(constants.updatedPlaylist)
        .end((err, res) => {
          res.should.have.status(200);
          done();
        });
    });

    it('should return the expected body response when correct parameters are sent', done => {
      request(app)
        .put(`/api/playlists/${validPlaylistId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(constants.updatedPlaylist)
        .end((err, res) => {
          res.body.should.be.a('object');
          res.body.should.have.property('id');
          res.body.should.have.property('name').eql(constants.updatedPlaylist.name);
          res.body.should.have.property('description').eql(constants.updatedPlaylist.description);
          res.body.should.have.property('href');
          // res.body.should.have.property('owner'); TODO
          // res.body.should.have.property('tracks'); TODO
          done();
        });
    });

    it('should return status code 400 when parameters are missing', done => {
      request(app)
        .put(`/api/playlists/${validPlaylistId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(constants.updatedTrackWithMissingAttributes)
        .end((err, res) => {
          res.should.have.status(400);
          done();
        });
    });

    it('should return status code 400 when parameters are invalid', done => {
      request(app)
        .put(`/api/playlists/${validPlaylistId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(constants.invalidPlaylist)
        .end((err, res) => {
          res.should.have.status(400);
          done();
        });
    });

    it('should return status code 400 with non existent track id', done => {
      request(app)
        .put(`/api/playlists/${validPlaylistId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(constants.updatedPlaylistWithNonExistentTrack)
        .end((err, res) => {
          res.should.have.status(400);
          res.body.should.have.property('message').eql('Non existing track.');
          done();
        });
    });

    it('should return status code 400 with non existent user id', done => {
      request(app)
        .put(`/api/playlists/${validPlaylistId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(constants.updatedPlaylistWithNonExistentOwner)
        .end((err, res) => {
          res.should.have.status(400);
          res.body.should.have.property('message').eql('Non existing user.');
          done();
        });
    });

    it('should return status code 404 if id does not match a playlist', done => {
      request(app)
        .put(`/api/playlists/${constants.invalidPlaylistId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(constants.updatedPlaylist)
        .end((err, res) => {
          res.should.have.status(404);
          done();
        });
    });

    it('should return status code 401 if unauthorized', done => {
      request(app)
        .put(`/api/playlists/${validPlaylistId}`)
        .set('Authorization', 'Bearer UNAUTHORIZED')
        .send(constants.updatedPlaylist)
        .end((err, res) => {
          res.should.have.status(401);
          done();
        });
    });
  });

  describe('/DELETE playlists/{id}', () => {
    it('should return status code 204 when deletion is successful', done => {
      request(app)
        .delete(`/api/playlists/${validPlaylistId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .end((err, res) => {
          res.should.have.status(204);
          done();
        });
    });

    it('should return status code 404 if id does not match a playlist', done => {
      request(app)
        .delete(`/api/playlists/${constants.invalidPlaylistId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .end((err, res) => {
          res.should.have.status(404);
          done();
        });
    });

    it('should return status code 401 if unauthorized', done => {
      request(app)
        .delete(`/api/playlists/${validPlaylistId}`)
        .set('Authorization', 'Bearer UNAUTHORIZED')
        .end((err, res) => {
          res.should.have.status(401);
          done();
        });
    });
  });
});
