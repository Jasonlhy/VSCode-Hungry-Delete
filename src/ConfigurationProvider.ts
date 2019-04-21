import { workspace, TextLine, languages } from 'vscode';

interface IndentationRules {
    increaseIndentPattern?: RegExp
    decreaseIndentPattern?: RegExp
}

interface LanguageConfiguartion {
    languageId: string,
    indentationRules?:  IndentationRules
}

/**
 * Configuration JS Object
 */
export interface HungryDeleteConfiguration {
    KeepOneSpace?: boolean
    CoupleCharacters: string[],
    ConsiderIndentationRules?: boolean,
    LanguageConfigurations?:  LanguageConfiguartion[]
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

    // TODO: May be a better way to handle this
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

    _mapIndentionRules = (json: any) : IndentationRules => {
        let increaseIndentPattern: RegExp, decreaseIndentPattern: RegExp;

        if (json){
            if (json.increaseIndentPattern){
                increaseIndentPattern = new RegExp(json.increaseIndentPattern);
            }

            if (json.decreaseIndentPattern){
                decreaseIndentPattern = new RegExp(json.decreaseIndentPattern);
            }

            return {
                increaseIndentPattern: increaseIndentPattern,
                decreaseIndentPattern: decreaseIndentPattern
            }
        }

        return undefined;
    }

    _mapLanguageConfig = (json: any) : LanguageConfiguartion => {
        const languageId: string = json.languageId;
        const indentationRules: IndentationRules = this._mapIndentionRules(json.indentationRules);

        return {
            languageId: languageId,
            indentationRules: indentationRules
        }
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
            const langConfigJSONArray: any[] = workspace.getConfiguration().get('hungryDelete.languageConfigurations')
            if (langConfigJSONArray){
                var langConfigs: LanguageConfiguartion[] = langConfigJSONArray.map(json => this._mapLanguageConfig(json));
            }

            return {
                KeepOneSpace: workspace.getConfiguration().get('hungryDelete.keepOneSpace'),
                CoupleCharacters: ConfigurationProvider.CoupleCharacters,
                ConsiderIndentationRules: workspace.getConfiguration().get('hungryDelete.considerIndentationRules'),
                LanguageConfigurations: langConfigs
            }
        }
    }

    increaseIndentAfterLine(textLine: TextLine, languageId: string){
        const config = this.getConfiguration();
        if (!config.ConsiderIndentationRules){
            return false;
        }

        const languageConfigs = config.LanguageConfigurations.filter(langConfig => langConfig.languageId === languageId);
        if (languageConfigs.length > 0){
            const langConfig = languageConfigs[0];
            if (langConfig.indentationRules){
                return langConfig.indentationRules.increaseIndentPattern.test(textLine.text)
            }
        }

        return false;
    }
}
