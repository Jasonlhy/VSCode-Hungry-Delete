import { workspace, TextLine, Disposable } from 'vscode';

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
    ConsiderIncreaseIndentPattern?: boolean,
    FollowAbovelineIndent?: boolean,
    LanguageConfigurations?:  LanguageConfiguartion[],
    KeepOneSpaceException?: string,
}

/**
 * Prvoide configuration which affects the execution behaviour of hungry delete and smart backspace, not the "when" condition
 *
 * 1. Provide a TypeSafe config object, meanwhile caches the configuration
 * 2. Stub the config without actually reading the vscode workspace config (For testing purpose)
 *
 */
export class ConfigurationProvider {
    private config?: HungryDeleteConfiguration;
    private workspaceListener: Disposable;

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
            }
        }

        return undefined;
    }

    private _mapLanguageConfig = (json: any) : LanguageConfiguartion => {
        const languageId: string = json.languageId;
        const indentationRules: IndentationRules = this._mapIndentionRules(json.indentationRules);

        return {
            languageId: languageId,
            indentationRules: indentationRules
        }
    }

    private _getLanguageConfigurations = () : LanguageConfiguartion[]  => {
        const jsonArray: any[] = workspace.getConfiguration().get('hungryDelete.languageConfigurations')
        if (jsonArray){
            return jsonArray.map(json => this._mapLanguageConfig(json));
        }

        return undefined;
    }

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
    }

    /**
     * Remove listener which listen the workspace configuration change in order to prevent memory leak
     */
    public unlistenConfigurationChange = () => {
        if (this.workspaceListener){
            this.workspaceListener.dispose();
        }
    }

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
            KeepOneSpace: workspaceConfig.get('keepOneSpace'),
            KeepOneSpaceException: workspaceConfig.get('keepOneSpaceException'),
            CoupleCharacters: ConfigurationProvider.CoupleCharacters,
            ConsiderIncreaseIndentPattern: workspaceConfig.get('considerIncreaseIndentPattern'),
            FollowAbovelineIndent: workspaceConfig.get('followAbovelineIndent'),
            LanguageConfigurations: this._getLanguageConfigurations(),
        }

        return this.config;
    }

    /**
     * Clear the internal configuration cache
     *
     * @private
     * @memberof ConfigurationProvider
     */
    private _resetConfiguration = () => {
        this.config = null;
    }

    isKeepOnespaceException(char: string){
        const config = this.getConfiguration();
        if (!config.KeepOneSpaceException){
            return false;
        }

        return config.KeepOneSpaceException.indexOf(char) >= 0;
    }

    increaseIndentAfterLine(textLine: TextLine, languageId: string){
        const config = this.getConfiguration();
        if (!config.ConsiderIncreaseIndentPattern){
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
