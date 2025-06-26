  -- Enhanced MySQL Schema for Crowdsourced GeoTracker
-- This schema includes multiple tables for better data organization and scalability

CREATE DATABASE IF NOT EXISTS crowdsourced_map;
USE crowdsourced_map;

  -- Users table for authentication and user management
  CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'moderator', 'user') DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_active (is_active)
  );

  -- Report types/categories table for better organization
  CREATE TABLE report_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#FF0000', -- Hex color for map markers
    icon VARCHAR(50), -- Icon filename
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_name (name),
    INDEX idx_active (is_active)
  );

  -- Locations/areas table for predefined geographic areas
  CREATE TABLE locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    boundary POLYGON NOT NULL SRID 4326, -- Geographic boundary
    country VARCHAR(50),
    region VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    SPATIAL INDEX(boundary),
    INDEX idx_name (name),
    INDEX idx_country (country),
    INDEX idx_active (is_active)
  );

  -- Enhanced reports table with foreign keys
  CREATE TABLE reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT, -- NULL for anonymous reports
    type_id INT NOT NULL,
    location_id INT, -- Optional reference to predefined location
    coordinates POINT NOT NULL SRID 4326,
    title VARCHAR(200),
    description TEXT,
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    confidence_level ENUM('low', 'medium', 'high') DEFAULT 'medium',
    status ENUM('pending', 'verified', 'rejected', 'expired') DEFAULT 'pending',
    media_url TEXT,
    source_url TEXT, -- External source URL
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (type_id) REFERENCES report_types(id) ON DELETE RESTRICT,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL,
    
    -- Spatial index for geographic queries
    SPATIAL INDEX(coordinates),
    
    -- Regular indexes for performance
    INDEX idx_user (user_id),
    INDEX idx_type (type_id),
    INDEX idx_location (location_id),
    INDEX idx_valid_from (valid_from),
    INDEX idx_valid_until (valid_until),
    INDEX idx_status (status),
    INDEX idx_confidence (confidence_level),
    INDEX idx_created (created_at)
  );

  -- Report media attachments table
  CREATE TABLE report_media (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT,
    mime_type VARCHAR(100),
    is_primary BOOLEAN DEFAULT FALSE,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    
    INDEX idx_report (report_id),
    INDEX idx_primary (is_primary)
  );

  -- Report verification/votes table
  CREATE TABLE report_votes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    user_id INT NOT NULL,
    vote_type ENUM('upvote', 'downvote', 'verify', 'dispute') NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Prevent duplicate votes from same user on same report
    UNIQUE KEY unique_user_report (user_id, report_id),
    INDEX idx_report (report_id),
    INDEX idx_user (user_id),
    INDEX idx_vote_type (vote_type)
  );

  -- Report comments/discussion table
  CREATE TABLE report_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    user_id INT NOT NULL,
    parent_id INT NULL, -- For nested comments
    content TEXT NOT NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES report_comments(id) ON DELETE CASCADE,
    
    INDEX idx_report (report_id),
    INDEX idx_user (user_id),
    INDEX idx_parent (parent_id),
    INDEX idx_created (created_at)
  );

  -- Audit log table for tracking changes
  CREATE TABLE audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_table (table_name),
    INDEX idx_record (record_id),
    INDEX idx_created (created_at)
  );

  -- API rate limiting table
  CREATE TABLE api_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    endpoint VARCHAR(100) NOT NULL,
    method VARCHAR(10) NOT NULL,
    response_code INT,
    response_time_ms INT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_ip (ip_address),
    INDEX idx_endpoint (endpoint),
    INDEX idx_created (created_at)
  );

  -- Insert default report types
  INSERT INTO report_types (name, description, color, icon) VALUES
  ('Political Movement', 'Political rallies, marches, or gatherings', '#FF5733', 'political_movement.png'),
  ('Road Blockade', 'Obstruction or closure of roads', '#C70039', 'road_blockade.png'),
  ('Protest', 'Public demonstrations or protests', '#FFC300', 'protest.png'),
  ('Genjam', 'General disorder or chaos', '#900C3F', 'genjam.png'),
  ('VIP Movement', 'Movement of VIPs causing disruptions', '#2980B9', 'vip_movement.png'),
  ('Fire', 'Fire incidents or hazards', '#E74C3C', 'fire.png'),
  ('Traffic Jam', 'Heavy traffic congestion', '#27AE60', 'traffic_jam.png');

-- Insert sample locations (Dhaka district)
INSERT INTO locations (name, description, boundary, country, region) VALUES
('Dhaka City', 'Dhaka metropolitan area', 
 ST_GeomFromText('POLYGON((90.32 23.68, 90.52 23.68, 90.52 23.90, 90.32 23.90, 90.32 23.68))', 4326),
 'Bangladesh', 'Dhaka'),
('Dhaka District', 'Dhaka district and surrounding areas', 
 ST_GeomFromText('POLYGON((90.10 23.60, 90.70 23.60, 90.70 24.00, 90.10 24.00, 90.10 23.60))', 4326),
 'Bangladesh', 'Dhaka'),
('Narayanganj', 'Narayanganj district', 
 ST_GeomFromText('POLYGON((90.45 23.60, 90.65 23.60, 90.65 23.85, 90.45 23.85, 90.45 23.60))', 4326),
 'Bangladesh', 'Dhaka');
-- Create admin user (password: admin123 - should be changed in production)
INSERT INTO users (username, email, password_hash, role) VALUES
('admin', 'admin@DhakaAlert.com', '$2b$10$rQZ8K9mN2pL7vX1cY3wE6uI8oP9qR0sT1uV2wX3yZ4aA5bB6cC7dD8eE9fF0gG', 'admin');

-- Enable spatial functions
SET sql_mode = '';