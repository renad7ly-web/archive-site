CREATE DATABASE IF NOT EXISTS archive_site CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE archive_site;

CREATE TABLE IF NOT EXISTS years (
  id INT AUTO_INCREMENT PRIMARY KEY,
  year SMALLINT NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS archive_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  year_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(50),
  file_size INT,
  archive_date DATE NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (year_id) REFERENCES years(id),
  INDEX idx_title (title),
  INDEX idx_archive_date (archive_date)
) ENGINE=InnoDB;
