declare global {
    namespace Aromix {
        type GlobPattern = string | string[];
        function load(pattern: GlobPattern): string[];
    }
}

export * from './build';
export * from './config';
export * from './context';
export * from './entity/builder';
export * from './entity/entity';
export * from './fetch/codec';
export * from './fetch/fetch';
export * from './make/impl';
export * from './plugin';

