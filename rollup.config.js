import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

const target = process.env.TARGET || 'node';

const config = {
    input: target === 'browser' ? 'src/browser.ts' : 'src/node.ts',
    plugins: [
        resolve(),
        commonjs(),
        typescript({
            tsconfig: './tsconfig.json',
            declaration: false,
            declarationDir: undefined
        })
    ]
};

if (target === 'node') {
    config.output = [
        {
            file: 'dist/node/index.js',
            format: 'cjs',
            exports: 'named'
        },
        {
            file: 'dist/esm/index.js',
            format: 'es'
        }
    ];
    config.external = ['crypto', 'https', 'fs', 'path'];
} else if (target === 'browser') {
    config.output = {
        file: 'dist/browser/index.js',
        format: 'es',
        name: 'Nomyo'
    };
}

export default config;
