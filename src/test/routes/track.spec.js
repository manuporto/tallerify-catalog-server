process.env.NODE_ENV = 'test';

const app = require('../../app');
const db = require('../../database');
const tables = require('../../database/tableNames');
const dbHandler = require('../../handlers/db');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const chai = require('chai');
const chaiHttp = require('chai-http');
const logger = require('../../utils/logger');

chai.should();
chai.use(chaiHttp);

const config = require('./../../config');
const constants = require('./track.constants.json');

const testToken = jwt.sign(constants.jwtTestUser, config.secret);

describe('Track', () => {

  beforeEach((done) => {
    db.migrate.rollback()
    .then(() => {
      db.migrate.latest()
        .then(() => {
          dbHandler.general.createNewEntry(tables.artists,
            [
              constants.initialArtist,
              constants.initialArtist2,
            ])
            .then((artists) => {
            logger.info(`Tests artists created: ${JSON.stringify(artists, null, 4)}`);
            dbHandler.track.createNewTrackEntry(constants.initialTrack)
              .then((tracks) => {
              logger.info(`Tests tracks created: ${JSON.stringify(tracks, null, 4)}`);
              done();
            })
              .catch((error) => {
                logger.warn(`Test tracks creation error: ${error}`);
                done(error);
              });
          })
            .catch((error) => {
              logger.warn(`Test artists creation error: ${error}`);
              done(error);
            });
        })
        .catch(error => done(error));
    });
  });

  afterEach((done) => {
    db.migrate.rollback()
    .then(() => done());
  });
  
  describe('/GET tracks', () => {
    it('should return status code 200', (done) => {
      request(app)
        .get('/api/tracks')
        .set('Authorization', `Bearer ${testToken}`)
        .end((err, res) => {
          res.should.have.status(200);
          done();
        });
    });

    it('should return the expected body response when correct parameters are sent', (done) => {
      request(app)
        .get('/api/tracks')
        .set('Authorization', `Bearer ${testToken}`)
        .end((err, res) => {
          logger.info(`Tracks: ${JSON.stringify(res.body.tracks, null, 4)}`);
          res.body.should.be.a('object');
          res.body.should.have.property('metadata');
          res.body.metadata.should.have.property('version');
          res.body.metadata.should.have.property('count');
          res.body.should.have.property('tracks');
          res.body.tracks.should.be.a('array');
          res.body.tracks.should.have.lengthOf(1);
          done();
        });
    });

    it('should return status code 401 if unauthorized', (done) => {
      request(app)
        .get('/api/tracks')
        .set('Authorization', 'Bearer UNAUTHORIZED')
        .end((err, res) => {
          res.should.have.status(401);
          done();
        });
    });
  });

  describe('/POST tracks', () => {

    it('should return status code 400 when parameters are missing', (done) => {
      request(app)
        .post('/api/tracks')
        .set('Authorization', `Bearer ${testToken}`)
        .send(constants.newTrackWithMissingAttributes)
        .end((err, res) => {
          res.should.have.status(400);
          done();
        });
    });

    it('should return status code 400 when parameters are invalid', (done) => {
      request(app)
        .post('/api/tracks')
        .set('Authorization', `Bearer ${testToken}`)
        .send(constants.invalidTrack)
        .end((err, res) => {
          res.should.have.status(400);
          done();
        });
    });

    it('should return status code 201 when correct parameters are sent', (done) => {
      request(app)
        .post('/api/tracks')
        .set('Authorization', `Bearer ${testToken}`)
        .send(constants.testTrack)
        .end((err, res) => {
          res.should.have.status(201);
          done();
        });
    });

    it('should return status code 400 with non existent artist id', (done) => {
      request(app)
        .post('/api/tracks')
        .set('Authorization', `Bearer ${testToken}`)
        .send(constants.newTrackWithNonExistentArtist)
        .end((err, res) => {
          res.should.have.status(400);
          res.body.should.have.property('message').eql('Non existing artist.');
          done();
        });
    });

    it('should return the expected body response when correct parameters are sent', (done) => {
      request(app)
        .post('/api/tracks')
        .set('Authorization', `Bearer ${testToken}`)
        .send(constants.testTrack)
        .end((err, res) => {
          res.body.should.be.a('object');
          res.body.should.have.property('id');
          res.body.should.have.property('name').eql(constants.testTrack.name);
          res.body.should.have.property('duration');
          res.body.should.have.property('href');
          res.body.should.have.property('album'); // TODO
          // res.body.should.have.property('artists'); TODO
          res.body.should.have.property('popularity');
          // TODO add check for 'rate: int' inside popularity object
          done();
        });
    });

    it('should return status code 401 if unauthorized', (done) => {
      request(app)
        .post('/api/tracks')
        .set('Authorization', 'Bearer UNAUTHORIZED')
        .send(constants.testTrack)
        .end((err, res) => {
          res.should.have.status(401);
          done();
        });
    });
  });

  describe('/GET tracks/{id}', () => {
    it('should return status code 200', (done) => {
      request(app)
        .get(`/api/tracks/${constants.validTrackId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .end((err, res) => {
          res.should.have.status(200);
          done();
        });
    });

    it('should return track data', (done) => {
      request(app)
        .get(`/api/tracks/${constants.validTrackId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .end((err, res) => {
          res.body.should.be.a('object');
          res.body.should.have.property('metadata');
          res.body.metadata.should.have.property('version');
          res.body.metadata.should.have.property('count');
          res.body.should.have.property('track');
          res.body.track.should.have.property('id').eql(constants.validTrackId);
          res.body.track.should.have.property('name').eql(constants.initialTrack.name);
          res.body.track.should.have.property('duration');
          res.body.track.should.have.property('href');
          res.body.track.should.have.property('album');
          res.body.track.should.have.property('artists')
            .eql([
              constants.initialShortArtist,
              constants.initialShortArtist2,
            ]);
          res.body.track.should.have.property('popularity');
          // TODO add check for 'rate: int' inside popularity object
          done();
        });
    });

    it('should return status code 404 if id does not match a track', (done) => {
      request(app)
        .get(`/api/tracks/${constants.invalidTrackId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .end((err, res) => {
          res.should.have.status(404);
          done();
        });
    });

    it('should return status code 401 if unauthorized', (done) => {
      request(app)
        .get(`/api/tracks/${constants.invalidTrackId}`)
        .set('Authorization', 'Bearer UNAUTHORIZED')
        .end((err, res) => {
          res.should.have.status(401);
          done();
        });
    });
  });

  describe('/PUT tracks/{id}', () => {
    it('should return status code 201 when correct parameters are sent', (done) => {
      request(app)
        .put(`/api/tracks/${constants.validTrackId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(constants.updatedTrack)
        .end((err, res) => {
          res.should.have.status(200);
          done();
        });
    });

    it('should return the expected body response when correct parameters are sent', (done) => {
      request(app)
        .put(`/api/tracks/${constants.validTrackId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(constants.updatedTrack)
        .end((err, res) => {
          res.body.should.be.a('object');
          res.body.should.have.property('id');
          res.body.should.have.property('name').eql(constants.updatedTrack.name);
          res.body.should.have.property('duration');
          res.body.should.have.property('href');
          res.body.should.have.property('album'); // TODO
          // res.body.should.have.property('artists'); TODO
          res.body.should.have.property('popularity');
          // TODO add check for 'rate: int' inside popularity object
          done();
        });
    });

    it('should return status code 400 when parameters are missing', (done) => {
      request(app)
        .put(`/api/tracks/${constants.validTrackId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(constants.updatedTrackWithMissingAttributes)
        .end((err, res) => {
          res.should.have.status(400);
          done();
        });
    });

    it('should return status code 400 when parameters are invalid', (done) => {
      request(app)
        .put(`/api/tracks/${constants.validTrackId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(constants.invalidTrack)
        .end((err, res) => {
          res.should.have.status(400);
          done();
        });
    });

    it('should return status code 404 if id does not match a track', (done) => {
      request(app)
        .put(`/api/tracks/${constants.invalidTrackId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(constants.updatedTrack)
        .end((err, res) => {
          res.should.have.status(404);
          done();
        });
    });

    it('should return status code 401 if unauthorized', (done) => {
      request(app)
        .put(`/api/tracks/${constants.validTrackId}`)
        .set('Authorization', 'Bearer UNAUTHORIZED')
        .send(constants.updatedTrack)
        .end((err, res) => {
          res.should.have.status(401);
          done();
        });
    });
  });

  describe('/DELETE tracks/{id}', () => {
    it('should return status code 204 when deletion is successful', (done) => {
      request(app)
        .delete(`/api/tracks/${constants.validTrackId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .end((err, res) => {
          res.should.have.status(204);
          done();
        });
    });

    it('should return status code 404 if id does not match a track', (done) => {
      request(app)
        .delete(`/api/tracks/${constants.invalidTrackId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .end((err, res) => {
          res.should.have.status(404);
          done();
        });
    });

    it('should return status code 401 if unauthorized', (done) => {
      request(app)
        .delete(`/api/tracks/${constants.validTrackId}`)
        .set('Authorization', 'Bearer UNAUTHORIZED')
        .end((err, res) => {
          res.should.have.status(401);
          done();
        });
    });
  });

  describe('/POST tracks/{id}/like', () => {
    it('should return status code 201 when track like is successful', (done) => {
      request(app)
        .post(`/api/tracks/${constants.validTrackId}/like`)
        .set('Authorization', `Bearer ${testToken}`)
        .end((err, res) => {
          res.should.have.status(201);
          done();
        });
    });

    it('should return status code 201 when track like is duplicated', (done) => {
      request(app)
        .post(`/api/tracks/${constants.validTrackId}/like`)
        .set('Authorization', `Bearer ${testToken}`)
        .end((err, res) => {
          res.should.have.status(201);
          request(app)
            .post(`/api/tracks/${constants.validTrackId}/like`)
            .set('Authorization', `Bearer ${testToken}`)
            .end((err, res) => {
              res.should.have.status(201);
              done();
            });
        });
    });

    it('should return status code 404 if id does not match a track', (done) => {
      request(app)
        .post(`/api/tracks/${constants.invalidTrackId}/like`)
        .set('Authorization', `Bearer ${testToken}`)
        .end((err, res) => {
          res.should.have.status(404);
          done();
        });
    });

    it('should return status code 401 if unauthorized', (done) => {
      request(app)
        .post(`/api/tracks/${constants.validTrackId}/like`)
        .set('Authorization', 'Bearer UNAUTHORIZED')
        .end((err, res) => {
          res.should.have.status(401);
          done();
        });
    });
  });

  describe('/DELETE tracks/{id}/like', () => {
    it('should return status code 204 when deletion is successful', (done) => {
      request(app)
        .post(`/api/tracks/${constants.validTrackId}/like`)
        .set('Authorization', `Bearer ${testToken}`)
        .end((err, res) => {
          res.should.have.status(201);
          request(app)
            .delete(`/api/tracks/${constants.validTrackId}/like`)
            .set('Authorization', `Bearer ${testToken}`)
            .end((err, res) => {
              res.should.have.status(204);
              done();
            });
        });
    });

    it('should return status code 204 if disliked track was never liked', (done) => {
      request(app)
        .delete(`/api/tracks/${constants.validTrackId}/like`)
        .set('Authorization', `Bearer ${testToken}`)
        .end((err, res) => {
          res.should.have.status(204);
          done();
        });
    });

    it('should return status code 404 if id does not match a track', (done) => {
      request(app)
        .delete(`/api/tracks/${constants.invalidTrackId}/like`)
        .set('Authorization', `Bearer ${testToken}`)
        .end((err, res) => {
          res.should.have.status(404);
          done();
        });
    });

    it('should return status code 401 if unauthorized', (done) => {
      request(app)
        .delete(`/api/tracks/${constants.validTrackId}/like`)
        .set('Authorization', 'Bearer UNAUTHORIZED')
        .end((err, res) => {
          res.should.have.status(401);
          done();
        });
    });
  });

  describe('/GET tracks/{id}/popularity', () => {
    it('should return status code 200', (done) => {
      request(app)
        .get(`/api/tracks/${constants.validTrackId}/popularity`)
        .set('Authorization', `Bearer ${testToken}`)
        .end((err, res) => {
          res.should.have.status(200);
          done();
        });
    });

    it('should return track popularity 0', (done) => {
      request(app)
        .get(`/api/tracks/${constants.validTrackId}/popularity`)
        .set('Authorization', `Bearer ${testToken}`)
        .end((err, res) => {
          res.body.should.be.a('object');
          res.body.should.have.property('metadata');
          res.body.metadata.should.have.property('version');
          res.body.metadata.should.have.property('count');
          res.body.should.have.property('popularity');
          res.body.popularity.should.have.property('rate').eql(0);
          done();
        });
    });

    it('should return track popularity non 0', (done) => {
      request(app)
        .post(`/api/tracks/${constants.validTrackId}/popularity`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(constants.validTrackRate)
        .end((err, res) => {
          res.should.have.status(201);
          request(app)
            .get(`/api/tracks/${constants.validTrackId}/popularity`)
            .set('Authorization', `Bearer ${testToken}`)
            .end((err, res) => {
              res.body.should.be.a('object');
              res.body.should.have.property('metadata');
              res.body.metadata.should.have.property('version');
              res.body.metadata.should.have.property('count');
              res.body.should.have.property('popularity');
              res.body.popularity.should.have.property('rate').eql(constants.validTrackRate.rate);
              done();
            });
        });
    });

    it('should return status code 404 if id does not match a track', (done) => {
      request(app)
        .get(`/api/tracks/${constants.invalidTrackId}/popularity`)
        .set('Authorization', `Bearer ${testToken}`)
        .end((err, res) => {
          res.should.have.status(404);
          done();
        });
    });

    it('should return status code 401 if unauthorized', (done) => {
      request(app)
        .get(`/api/tracks/${constants.validTrackId}/popularity`)
        .set('Authorization', 'Bearer UNAUTHORIZED')
        .end((err, res) => {
          res.should.have.status(401);
          done();
        });
    });
  });

  describe('/POST tracks/{id}/popularity', () => {
    it('should return status code 201', (done) => {
      request(app)
        .post(`/api/tracks/${constants.validTrackId}/popularity`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(constants.validTrackRate)
        .end((err, res) => {
          res.should.have.status(201);
          done();
        });
    });

    it('should return user\'s track rate', (done) => {
      request(app)
        .post(`/api/tracks/${constants.validTrackId}/popularity`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(constants.validTrackRate)
        .end((err, res) => {
          res.body.should.have.property('rate').eql(constants.validTrackRate.rate);
          done();
        });
    });

    it('should return status code 400 when parameters are invalid', (done) => {
      request(app)
        .post(`/api/tracks/${constants.validTrackId}/popularity`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(constants.invalidTrackRate)
        .end((err, res) => {
          res.should.have.status(400);
          done();
        });
    });

    it('should return status code 400 when rate is out of range', (done) => {
      request(app)
        .post(`/api/tracks/${constants.validTrackId}/popularity`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(constants.outOfRangeTrackRate)
        .end((err, res) => {
          res.should.have.status(400);
          done();
        });
    });

    it('should return status code 404 if id does not match a track', (done) => {
      request(app)
        .post(`/api/tracks/${constants.invalidTrackId}/popularity`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(constants.validTrackRate)
        .end((err, res) => {
          res.should.have.status(404);
          done();
        });
    });

    it('should return status code 401 if unauthorized', (done) => {
      request(app)
        .post(`/api/tracks/${constants.validTrackIdTrackId}/popularity`)
        .set('Authorization', 'Bearer UNAUTHORIZED')
        .send(constants.validTrackRate)
        .end((err, res) => {
          res.should.have.status(401);
          done();
        });
    });
  });
});