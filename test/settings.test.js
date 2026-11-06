import assert from 'node:assert/strict';
import test from 'node:test';
import { getDatabaseSettings } from '../src/settings.js';

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
