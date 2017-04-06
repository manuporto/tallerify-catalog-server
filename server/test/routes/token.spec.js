process.env.NODE_ENV = 'test';

const app = require('../../app');
const db = require('../../models');
let request = require('supertest');
let chai = require('chai');
let chaiHttp = require('chai-http');
let should = chai.should();
let expect = chai.expect;

chai.use(chaiHttp);

describe('Token', () => {

  before(done => {
    db.users.sync({force: true})
      .then(() => {
        db.users.create({
          userName: 'abrden',
            password: '1234',
          firstName: 'Agustina',
          lastName: 'Barbetta',
          country: 'Argentina',
          email: 'a@a.com',
          birthdate: '12/8/1994',
          images: [ 'hello', 'world']
        });
      })
      .then(() => {
        done();
      })
      .catch(error => {
        done(error);
      });
  });

  describe('/POST tokens', () => {
    it('should return status code 400 when parameters are missing', done => {
      request(app)
        .post('/api/tokens')
        .send({
          userName: 'abrden'
        }).end((err, res) => {
         res.should.have.status(400);
         done();
      });
    });

    it('should return status code 500 when credentials dont match', done => {
      request(app)
        .post('/api/tokens')
        .send({
          userName: 'tano_villano',
          password: 'hitler5',
        }).end((err, res) => {
          res.should.have.status(500);
          done();
      });
    });

    it('should return status code 201', done => {
      request(app)
        .post('/api/tokens')
        .send({
          userName: 'abrden',
          password: '1234',
        }).end((err, res) => {
          res.should.have.status(201);
          done();
      });
    });

    it('should return the expected body response when correct credentials are sent', done => {
      request(app)
        .post('/api/tokens')
        .send({
          userName: 'abrden',
          password: '1234',
        }).end((err, res) => {
          res.body.should.be.a('object');
          res.body.should.have.property('token');
          res.body.token.should.be.a('string');
          res.body.should.have.property('user');
          res.body.user.should.have.property('id');
          res.body.user.should.have.property('userName');
          res.body.user.should.have.property('href');
          done();
      });
    });

  });

});