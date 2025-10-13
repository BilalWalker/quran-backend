-- Add these improvements to your schema.sql

-- ============================================
-- INDEXES for Performance
-- ============================================

-- Ayahs indexes
CREATE INDEX IF NOT EXISTS idx_ayahs_surah_id ON ayahs(surah_id);
CREATE INDEX IF NOT EXISTS idx_ayahs_juz ON ayahs(juz_number);
CREATE INDEX IF NOT EXISTS idx_ayahs_number_in_quran ON ayahs(number_in_quran);

-- Translations indexes
CREATE INDEX IF NOT EXISTS idx_translations_ayah_id ON translations(ayah_id);
CREATE INDEX IF NOT EXISTS idx_translations_source_id ON translations(source_id);
CREATE INDEX IF NOT EXISTS idx_translations_approved ON translations(is_approved);

-- Full-text search for translations (SQLite FTS5)
CREATE VIRTUAL TABLE IF NOT EXISTS translations_fts USING fts5(
    translation_id,
    ayah_id,
    source_id,
    text,
    content=translations,
    content_rowid=id
);

-- Trigger to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS translations_ai AFTER INSERT ON translations BEGIN
    INSERT INTO translations_fts(rowid, translation_id, ayah_id, source_id, text)
    VALUES (new.id, new.id, new.ayah_id, new.source_id, new.text);
END;

CREATE TRIGGER IF NOT EXISTS translations_au AFTER UPDATE ON translations BEGIN
    UPDATE translations_fts SET text = new.text WHERE rowid = new.id;
END;

CREATE TRIGGER IF NOT EXISTS translations_ad AFTER DELETE ON translations BEGIN
    DELETE FROM translations_fts WHERE rowid = old.id;
END;

-- Audio files indexes
CREATE INDEX IF NOT EXISTS idx_audio_ayah_id ON audio_files(ayah_id);
CREATE INDEX IF NOT EXISTS idx_audio_reciter_id ON audio_files(reciter_id);
CREATE INDEX IF NOT EXISTS idx_audio_active ON audio_files(is_active);

-- Activity logs indexes
CREATE INDEX IF NOT EXISTS idx_activity_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_logs(entity_type, entity_id);

-- User sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON user_sessions(expires_at);

-- ============================================
-- VIEWS for Common Queries
-- ============================================

-- Complete ayah view with all data
CREATE VIEW IF NOT EXISTS v_ayahs_complete AS
SELECT 
    a.id,
    a.surah_id,
    a.number_in_surah,
    a.number_in_quran,
    a.text_arabic,
    a.text_uthmani,
    a.juz_number,
    a.hizb_number,
    s.name_arabic as surah_name_arabic,
    s.name_english as surah_name_english,
    s.name_transliterated as surah_name_transliterated,
    s.revelation_type
FROM ayahs a
JOIN surahs s ON a.surah_id = s.id;

-- Translations with language info
CREATE VIEW IF NOT EXISTS v_translations_complete AS
SELECT 
    t.id,
    t.ayah_id,
    t.source_id,
    t.text,
    t.footnotes,
    t.is_approved,
    ts.name as source_name,
    ts.author as source_author,
    l.code as language_code,
    l.name as language_name,
    l.direction as language_direction,
    a.surah_id,
    a.number_in_surah,
    a.number_in_quran,
    a.text_arabic
FROM translations t
JOIN translation_sources ts ON t.source_id = ts.id
JOIN languages l ON ts.language_id = l.id
JOIN ayahs a ON t.ayah_id = a.id;

-- Audio files with complete info
CREATE VIEW IF NOT EXISTS v_audio_complete AS
SELECT 
    af.id,
    af.ayah_id,
    af.reciter_id,
    af.file_path,
    af.file_name,
    af.format,
    af.duration,
    r.name as reciter_name,
    r.name_arabic as reciter_name_arabic,
    r.style as recitation_style,
    a.surah_id,
    a.number_in_surah,
    s.name_english as surah_name
FROM audio_files af
JOIN reciters r ON af.reciter_id = r.id
JOIN ayahs a ON af.ayah_id = a.id
JOIN surahs s ON a.surah_id = s.id
WHERE af.is_active = 1;

-- ============================================
-- TRIGGERS for updated_at
-- ============================================

-- Surahs
CREATE TRIGGER IF NOT EXISTS surahs_updated_at 
AFTER UPDATE ON surahs
BEGIN
    UPDATE surahs SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Ayahs
CREATE TRIGGER IF NOT EXISTS ayahs_updated_at 
AFTER UPDATE ON ayahs
BEGIN
    UPDATE ayahs SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Translations
CREATE TRIGGER IF NOT EXISTS translations_updated_at 
AFTER UPDATE ON translations
BEGIN
    UPDATE translations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Translation sources
CREATE TRIGGER IF NOT EXISTS translation_sources_updated_at 
AFTER UPDATE ON translation_sources
BEGIN
    UPDATE translation_sources SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Users
CREATE TRIGGER IF NOT EXISTS users_updated_at 
AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Audio files
CREATE TRIGGER IF NOT EXISTS audio_files_updated_at 
AFTER UPDATE ON audio_files
BEGIN
    UPDATE audio_files SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Reciters
CREATE TRIGGER IF NOT EXISTS reciters_updated_at 
AFTER UPDATE ON reciters
BEGIN
    UPDATE reciters SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Settings
CREATE TRIGGER IF NOT EXISTS settings_updated_at 
AFTER UPDATE ON settings
BEGIN
    UPDATE settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;