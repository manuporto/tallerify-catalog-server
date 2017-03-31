'use strict';
module.exports = function(sequelize, DataTypes) {
  const User = sequelize.define('users', {
    href: DataTypes.STRING,
    userName: { type: DataTypes.STRING, allowNull: false, validate: {
      notEmpty: true,
    }},
    firstName: { type: DataTypes.STRING, validate: {
      notEmpty: true,
    }},
    lastName: { type: DataTypes.STRING, allowNull: false, validate: {
      notEmpty: true,
    }},
    country: { type: DataTypes.STRING, allowNull: false, validate: {
      notEmpty: true,
    }},
    email: { type: DataTypes.STRING, allowNull: false, validate: {
      notEmpty: true,
      isEmail: true
    }},
    birthdate: { type: DataTypes.STRING, allowNull: false, validate: {
      notEmpty: true,
      isDate: true
    }},
    images: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: false, validate: {
      notEmpty: true,
    }},
    contacts: { type: DataTypes.ARRAY(DataTypes.INTEGER), defaultValue: []}
  }, {
    classMethods: {
      associate: function(db) {
        // associations can be defined here
      }
    }
  }, {
    timestamp: false
  });
  return User;
};
