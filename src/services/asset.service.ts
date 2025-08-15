import * as fs from 'fs';
import * as path from 'path';
import getProjectRootDir from '../utils/getProjectRootDir';
import {appLogger} from "../utils/logger";

export enum AssetType {
    STICKER = 'stickers',
    AUDIO = 'audios',
    MEME = 'memes'
}

export class AssetService {
    private readonly assetsDir: string;
    private readonly defaultAssetsPath: string;
    private readonly assetsNames: Map<AssetType, Set<string>> = new Map();

    private static instance: AssetService;

    static getInstance(): AssetService {
        if (!AssetService.instance) {
            AssetService.instance = new AssetService();
        }
        return AssetService.instance;
    }

    constructor() {
        this.assetsDir = path.join(getProjectRootDir(), 'user-data', 'assets');
        this.defaultAssetsPath = path.join(getProjectRootDir(), 'assets');
        this.assetsInitialLoad();

        for(const type of Object.values(AssetType)) {
            this.assetsNames.set(type, new Set<string>(this.loadAssetNames(type)));
        }
    }

    private assetsInitialLoad(): void {
        for(const type of Object.values(AssetType)) {
            const dirPath = path.join(this.assetsDir, type);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
                // Copia os arquivos padrão para o diretório
                const defaultAssetsPath = path.join(this.defaultAssetsPath, type);
                if (fs.existsSync(defaultAssetsPath)) {
                    const defaultFiles = fs.readdirSync(defaultAssetsPath);
                    for (const file of defaultFiles) {
                        const srcFile = path.join(defaultAssetsPath, file);
                        const destFile = path.join(dirPath, file);
                        if (!fs.existsSync(destFile)) {
                            fs.copyFileSync(srcFile, destFile);
                        }
                    }
                }
            }
        }

    }

    private loadAssetNames(dir: string): string[] {
        try {
            const files = fs.readdirSync(path.join(this.assetsDir, dir));
            // TODO: Validate if stickers are in webp format, if audios are in mp3 format, and if memes are in jpg format
            return files.map(file => path.parse(file).name);
        } catch (error) {
            appLogger.warn({}, `Aviso: Não foi possível carregar assets do diretório '${dir}'.`, error);
            return [];
        }
    }

    public is(type: AssetType, name: string): boolean {
        const names = this.assetsNames.get(type);
        if (!names) {
            appLogger.warn({}, `Tipo de asset desconhecido: ${type}`);
            return false;
        }
        return names.has(name);
    }

    public list(type: AssetType): string[] {
        const names = this.assetsNames.get(type);
        if (!names) {
            appLogger.warn({}, `Tipo de asset desconhecido: ${type}`);
            return [];
        }
        return Array.from(names);
    }
}
