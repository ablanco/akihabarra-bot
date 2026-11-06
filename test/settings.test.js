import assert from 'node:assert/strict';
import test from 'node:test';
import Settings, { getDatabaseSettings } from '../src/settings.js';

test('file settings provide complete bot and migration connections', () => {
    for (const config of [
        Settings.database,
        Settings.migration.source,
        Settings.migration.target,
    ]) {
        const resolved = getDatabaseSettings('UNUSED_SETTINGS_TEST_', config);
        for (const key of [
            'engine',
            'host',
            'port',
            'user',
            'password',
            'database',
            'connectionLimit',
        ]) {
            assert.notEqual(resolved[key], undefined, key);
        }
    }
    const configured = {
        engine: 'postgresql',
        host: 'db.example',
        port: 5433,
        user: 'user',
        password: 'password',
        database: 'snacks',
        connectionLimit: 7,
    };
    assert.deepEqual(
        getDatabaseSettings('UNUSED_SETTINGS_TEST_', configured),
        configured
    );
});

test('database settings preserve defaults and validate environment overrides', () => {
    const defaults = {
        host: 'localhost',
        user: 'test',
        password: 'default',
        database: 'test',
    };
    const prefix = 'AKIHABARRA_CONFIG_TEST_';
    const keys = ['ENGINE', 'PORT', 'PASSWORD', 'CONNECTION_LIMIT'];
    const original = keys.map((key) => process.env[prefix + key]);
    try {
        for (const key of keys) delete process.env[prefix + key];
        assert.equal(getDatabaseSettings(prefix, defaults).engine, 'mariadb');
        assert.equal(getDatabaseSettings(prefix, defaults).port, 3306);
        process.env[prefix + 'ENGINE'] = 'postgresql';
        process.env[prefix + 'PASSWORD'] = '';
        assert.equal(getDatabaseSettings(prefix, defaults).port, 5432);
        assert.equal(getDatabaseSettings(prefix, defaults).password, '');
        process.env[prefix + 'PORT'] = '65536';
        assert.throws(() => getDatabaseSettings(prefix, defaults), /PORT/);
        process.env[prefix + 'PORT'] = '5432';
        process.env[prefix + 'CONNECTION_LIMIT'] = '0';
        assert.throws(
            () => getDatabaseSettings(prefix, defaults),
            /CONNECTION_LIMIT/
        );
        process.env[prefix + 'ENGINE'] = 'sqlite';
        assert.throws(() => getDatabaseSettings(prefix, defaults), /ENGINE/);
    } finally {
        keys.forEach((key, i) => {
            if (original[i] === undefined) delete process.env[prefix + key];
            else process.env[prefix + key] = original[i];
        });
    }
});
