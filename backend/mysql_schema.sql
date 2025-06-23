-- MySQL Schema for Crowdsourced GeoTracker
-- Run this script to create the database and tables

CREATE DATABASE IF NOT EXISTS crowdsourced_geotracker;
USE crowdsourced_geotracker;

-- Create reports table with spatial support
CREATE TABLE reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  location POINT NOT NULL SRID 4326,
  type VARCHAR(50) NOT NULL,
  valid_from TIMESTAMP NOT NULL,
  valid_until TIMESTAMP NOT NULL,
  description TEXT,
  media_url TEXT,
  ip VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Spatial index for geographic queries
  SPATIAL INDEX(location),
  
  -- Regular indexes for performance
  INDEX idx_type (type),
  INDEX idx_valid_from (valid_from),
  INDEX idx_valid_until (valid_until),
  INDEX idx_type_valid (type, valid_from, valid_until)
);

-- Enable spatial functions
SET sql_mode = ''; 