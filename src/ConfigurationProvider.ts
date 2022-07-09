import { workspace, TextLine, Disposable } from 'vscode';

interface IndentationRules {
    increaseIndentPattern?: RegExp
    decreaseIndentPattern?: RegExp
}

interface LanguageConfiguration {
    languageId: string,
    indentationRules?:  IndentationRules
}

/**
 * Configuration JS Object
 */
export interface HungryDeleteConfiguration {
    keepOneSpace?: boolean
    coupleCharacters: string[],
    considerIncreaseIndentPattern?: boolean,
    followAboveLineIndent?: boolean,
    languageConfigurations?:  LanguageConfiguration[],
    keepOneSpaceException?: string,
}

/**
 * Provide configuration which affects the execution behavior of hungry delete and smart backspace, not the "when" condition
 *
 * 1. Provide a TypeSafe config object, meanwhile caches the configuration
 * 2. Stub the config without actually reading the vscode workspace config (For testing purpose)
 *
 */
export class ConfigurationProvider {
    private config?: HungryDeleteConfiguration;
    private workspaceListener: Disposable;

    // TODO: May be a better way to handle this
    static coupleCharacters = [
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
      *Get the default configuration, must be aligned with the value in settings.json
     *
     * @memberof ConfigurationProvider
     */
    static getDefaultConfiguration = () : HungryDeleteConfiguration => {
        return {
            keepOneSpace: false,
            coupleCharacters : ConfigurationProvider.coupleCharacters
        };
    };

    /**
     * Set the configuration of internal config object
     *
     * @memberof ConfigurationProvider
     */
    setConfiguration = (config: HungryDeleteConfiguration) => {
        this.config = config;
    };

    private _mapIndentionRules = (json: any) : IndentationRules => {
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
            };
        }

        return undefined;
    };

    private _mapLanguageConfig = (json: any) : LanguageConfiguration => {
        const languageId: string = json.languageId;
        const indentationRules: IndentationRules = this._mapIndentionRules(json.indentationRules);

        return {
            languageId: languageId,
            indentationRules: indentationRules
        };
    };

    private _getLanguageConfigurations = () : LanguageConfiguration[]  => {
        const jsonArray: any[] = workspace.getConfiguration().get('hungryDelete.languageConfigurations');
        if (jsonArray){
            return jsonArray.map(json => this._mapLanguageConfig(json));
        }

        return undefined;
    };

    /**
     * Attach listener which listen the workspace configuration change
     */
    public listenConfigurationChange = () => {
        this.workspaceListener = workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("hungryDelete")){
                this._resetConfiguration();
                console.log("Reset hungry delete configuration");
            }
        });
    };

    /**
     * Remove listener which listen the workspace configuration change in order to prevent memory leak
     */
    public unListenConfigurationChange = () => {
        if (this.workspaceListener){
            this.workspaceListener.dispose();
        }
    };

    /**
     * If internal configuration object exists, use it.
     *
     * Otherwise, use workspace configuration settings (Lazy loading of the config)
     *
     * @memberof ConfigurationProvider
     */
    getConfiguration = () : HungryDeleteConfiguration => {
        if (this.config) {
            return this.config;
        }

        const workspaceConfig = workspace.getConfiguration('hungryDelete');

        this.config = {
            keepOneSpace: workspaceConfig.get('keepOneSpace'),
            keepOneSpaceException: workspaceConfig.get('keepOneSpaceException'),
            coupleCharacters: ConfigurationProvider.coupleCharacters,
            considerIncreaseIndentPattern: workspaceConfig.get('considerIncreaseIndentPattern'),
            followAboveLineIndent: workspaceConfig.get('followAboveLineIndent'),
            languageConfigurations: this._getLanguageConfigurations(),
        };

        return this.config;
    };

    /**
     * Clear the internal configuration cache
     *
     * @private
     * @memberof ConfigurationProvider
     */
    private _resetConfiguration = () => {
        this.config = null;
    };

    isKeepOneSpaceException(char: string){
        const config = this.getConfiguration();
        if (!config.keepOneSpaceException){
            return false;
        }

        return config.keepOneSpaceException.indexOf(char) >= 0;
    }

    increaseIndentAfterLine(textLine: TextLine, languageId: string){
        const config = this.getConfiguration();
        if (!config.considerIncreaseIndentPattern){
            return false;
        }

        const languageConfigs = config.languageConfigurations.filter(langConfig => langConfig.languageId === languageId);
        if (languageConfigs.length > 0){
            const langConfig = languageConfigs[0];
            if (langConfig.indentationRules){
                return langConfig.indentationRules.increaseIndentPattern.test(textLine.text);
            }
        }

        return false;
    }
}
