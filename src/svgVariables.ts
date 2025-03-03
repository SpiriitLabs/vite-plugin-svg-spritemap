import { ResolvedConfig } from 'vite'
import type { SvgVariable } from './types'

/*
* This part of the plugin is mainly inspired by svg-spritemap-webpack-plugin implementation
* @see https://github.com/cascornelissen/svg-spritemap-webpack-plugin/blob/775c4b63cb7e2287201d2331544ed677a549ee84/lib/variable-parser.js
*/

export default class SVGVariables {
  private readonly VAR_NAMESPACE = 'var'
  private readonly VAR_NAMESPACE_VALUE = 'https://spiriitlabs.github.io/vite-plugin-svg-spritemap/'
  private VAR_REGEX = new RegExp(`${this.VAR_NAMESPACE}:([a-zA-Z0-9_-]+)(?:\\.([a-zA-Z0-9_-]+))?="([^"]*)"`, 'gi')
  private NAMESPACE_REGEX = new RegExp(`xmlns:${this.VAR_NAMESPACE}=('|")[^'"]*('|")`, 'gi')

  private _svg: string
  private _config: ResolvedConfig
  private _vars: Map<string, SvgVariable> = new Map()

  constructor(svg: string, config: ResolvedConfig) {
    this._svg = svg
    this._config = config

    // Add missing namespace if not present to prevent failed extract SVG Dimensions
    if (!this.NAMESPACE_REGEX.exec(svg)) {
      this._svg = this._svg.replace(/<svg/i, `<svg xmlns:${this.VAR_NAMESPACE}="${this.VAR_NAMESPACE_VALUE}"`);
    }
    this._vars = this.extract()
  }

  private extract() {
    const variables: Map<string, SvgVariable> = new Map()
    const matches = this._svg.match(this.VAR_REGEX)

    if (matches) {
      matches.forEach(match => {
        const [, name, attribute, value] = this.VAR_REGEX.exec(match) || []
        if (variables.has(name) && variables.get(name)?.value !== value) {
          this._config.logger.warnOnce(`[vite-plugin-svg-spritemap] Duplicate variable name for ${name} with different values`);
        }
        if (name && value) {
          variables.set(
            name,
            {
              name,
              attribute: attribute || name,
              value,
              svg: this._svg
            }
          )
        }
      })
    }

    return variables
  }

  public get vars() {
    return Array.from(this._vars.values());
  }

  clean() {
    return this._svg.replace(this.VAR_REGEX, (match, name, attribute, value) => {
      // Name is optional and should be equal to the attribute if it's not provided
      if (!attribute) {
        attribute = name
      }

      return `${attribute}="${value}"`
    })
  }
}
