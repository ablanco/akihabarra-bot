// Copyright (c) 2023 Alejandro Blanco <alejandro.b.e@gmail.com>
// MIT License

const settings = {
    // https://mariadb.com/kb/en/library/getting-started-with-the-nodejs-connector/
    database: {
        engine: 'mariadb', // 'mariadb' or 'postgresql'
        host: 'localhost',
        port: null, // null selects 3306 for MariaDB or 5432 for PostgreSQL
        user: 'akihabarabot',
        password: 'dev',
        database: 'akihabarra',
        connectionLimit: 100,
    },
    // Used only by npm run migrate:postgresql.
    migration: {
        source: {
            engine: 'mariadb',
            host: 'localhost',
            port: 3306,
            user: 'akihabarabot',
            password: 'dev',
            database: 'akihabarra',
            connectionLimit: 100,
        },
        target: {
            engine: 'postgresql',
            host: 'localhost',
            port: 5432,
            user: 'postgres',
            password: '',
            database: 'akihabarra',
            connectionLimit: 10,
        },
    },
    token: '',
};

// Empty passwords are valid; nullish fallback preserves explicitly empty values.
export function getDatabaseSettings(
    prefix = 'DB_',
    defaults = settings.database
) {
    const read = (name, fallback) =>
        process.env[`${prefix}${name}`] ?? fallback;
    const engine = read('ENGINE', defaults.engine || 'mariadb');
    const number = (name, fallback) => {
        const value = Number(read(name, fallback));
        if (
            !Number.isInteger(value) ||
            value < 1 ||
            (name === 'PORT' && value > 65535)
        ) {
            throw new Error(
                `${prefix}${name} must be a positive integer${
                    name === 'PORT' ? ' below 65536' : ''
                }`
            );
        }
        return value;
    };
    if (!['mariadb', 'postgresql'].includes(engine)) {
        throw new Error(`${prefix}ENGINE must be mariadb or postgresql`);
    }
    return {
        ...defaults,
        engine,
        host: read('HOST', defaults.host),
        port: number(
            'PORT',
            defaults.port ?? (engine === 'postgresql' ? 5432 : 3306)
        ),
        user: read('USER', defaults.user),
        password: read('PASSWORD', defaults.password),
        database: read('NAME', defaults.database),
        connectionLimit: number(
            'CONNECTION_LIMIT',
            defaults.connectionLimit ?? 10
        ),
    };
}

settings.database = getDatabaseSettings();
settings.token = process.env.TELEGRAM_TOKEN ?? settings.token;
export default settings;
