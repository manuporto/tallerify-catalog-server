const logger = require('../../utils/logger');
const tables = require('../tableNames');

exports.up = (knex, Promise) => {
	return Promise.all([
    
		knex.schema.createTableIfNotExists(tables.tracks, (table) => {
			logger.debug('Creating tracks table.');
			table.increments('id').primary();
			table.string('name');
			table.integer('duration');
      table.integer('albumId');
      table.string('href');
		}),

    knex.schema.createTableIfNotExists(tables.tracks_rating, (table) => {
      logger.debug('Creating tracks_rating table.');
      table.increments('id').primary();
      table.string('user_id');
      table.integer('track_id');
      table.integer('rating');
    }),

		knex.schema.createTableIfNotExists(tables.artists, (table) => {
			logger.debug('Creating artists table.');
			table.increments('id').primary();
			table.string('name');
			table.integer('popularity');
		}),

		knex.schema.createTableIfNotExists(tables.artists_tracks, (table) => {
			logger.debug('Creating artists_tracks table.');
			table.increments('artist_track_id').primary();
			table.integer('artist_id');
			table.integer('track_id');
		}),

    knex.schema.createTableIfNotExists(tables.users, (table) => {
      logger.debug('Creating users table.');
      table.increments('id').primary();
      table.bigInteger('facebookUserId');
      table.string('facebookAuthToken');
      table.string('userName');
      table.string('password');
      table.string('firstName');
      table.string('lastName');
      table.string('country');
      table.string('birthdate');
      table.string('email');
      table.specificType('images', 'text ARRAY');
      table.string('href');
    }),

    knex.schema.createTableIfNotExists(tables.admins, (table) => {
      logger.debug('Creating admins table.');
      table.increments('id').primary();
      table.string('userName');
      table.string('password');
      table.string('firstName');
      table.string('lastName');
      table.string('email');
    }),

    knex.schema.createTableIfNotExists(tables.users_tracks, (table) => {
      logger.debug('Creating users_tracks table.');
      table.increments('user_tracks_id').primary();
      table.integer('user_id');
      table.integer('track_id');
    }),

  ]);
};

exports.down = (knex, Promise) => {
	return Promise.all([
    knex.schema.dropTable(tables.tracks),
    knex.schema.dropTable(tables.tracks_rating),
    knex.schema.dropTable(tables.artists),
    knex.schema.dropTable(tables.artists_tracks),
    knex.schema.dropTable(tables.users),
    knex.schema.dropTable(tables.admins),
    knex.schema.dropTable(tables.users_tracks),
  ]);
};