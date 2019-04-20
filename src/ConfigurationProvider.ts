import { workspace } from 'vscode';

/**
 * Configuration JS Object
 */
export interface HungryDeleteConfiguration {
    KeepOneSpace?: boolean
    CoupleCharacters: string[] // TODO
}

/**
 * Prvoide configuration which affects the execution behaviour of hungry delete and smart backspace, not the "when" condition
 *
 * 1. Provide a TypeSafe config object
 * 2. Stub the config without actually reading the vscode workspace config (For testing purpose)
 *
 */
export class ConfigurationProvider {
    private config?: HungryDeleteConfiguration

    // May be a better way to handle this
    static CoupleCharacters = [
        "()",
        "[]",
        "<>",
        "{}",
        "''",
        "``",
        '""',
    ];

    constructor(config?: HungryDeleteConfiguration) {
        this.config = config;
    }

    /**
      *Get the default configuration, must be alligned with the value in settins.json
     *
     * @memberof ConfigurationProvider
     */
    static getDefaultConfiguration = () : HungryDeleteConfiguration => {
        return {
            KeepOneSpace: false,
            CoupleCharacters : ConfigurationProvider.CoupleCharacters
        }
    }

    /**
     * Set the configuration of internal config object
     *
     * @memberof ConfigurationProvider
     */
    setConfiguration = (config: HungryDeleteConfiguration) => {
        this.config = config;
    }

    /**
     * If internal configuration object exists, use it
     * Otherwise, use workspace configuration settings
     *
     * @memberof ConfigurationProvider
     */
    getConfiguration = () : HungryDeleteConfiguration => {
        if (this.config) {
            return this.config
        } else {
            return {
                KeepOneSpace: workspace.getConfiguration().get('hungryDelete.keepOneSpace'),
                CoupleCharacters: ConfigurationProvider.CoupleCharacters
            }
        }
    }
}
