/* eslint-disable */
/*
*  Copyright (C) 1998-2020 by Northwoods Software Corporation. All Rights Reserved.
*/

/*
* This is an extension and not part of the main GoJS library.
* Note that the API for this class may change with any version, even point releases.
* If you intend to use an extension in production, you should copy the code to your own source directory.
* Extensions can be found in the GoJS kit under the extensions or extensionsTS folders.
* See the Extensions intro page (https://gojs.net/latest/intro/extensions.html) for more information.
*/

import * as go from 'gojs';

// This file holds definitions of all standard shape figures -- string values for Shape.figure.

// The following functions and variables are used throughout this file:

/**
 * @hidden @internal
 * This FigureParameter class describes various properties each parameter uses in figures.
 */
export class FigureParameter {
    public static definedParameters: { [key: string]: Array<FigureParameter> } = {};
    private _name: string;
    private _defaultValue: number;
    private _minimum: number;
    private _maximum: number;

    constructor(name: string, def: number, min?: number, max?: number) {
        if (min === undefined) min = 0.0;
        if (max === undefined) max = Infinity;
        this._name = name;
        this._defaultValue = def;
        this._minimum = min;
        this._maximum = max;
        // (go.Shape as any)['_FigureParameters'] = {};
    }

    /**
     * Gets or sets the name of the figure.
     */
    get name(): string {
        return this._name;
    }

    set name(val: string) {
        if (typeof val !== 'string' || val === '') throw new Error('Shape name must be a valid string.');
        this._name = val;
    }

    /**
     * Gets or sets the default value for the parameter.
     */
    get defaultValue(): number {
        return this._defaultValue;
    }

    set defaultValue(val: number) {
        if (typeof val !== 'number' || isNaN(val)) throw new Error('The default value must be a real number, not: ' + val);
        this._defaultValue = val;
    }

    /**
     * Gets or sets the minimum value allowed for the figure parameter.
     */
    get minimum(): number {
        return this._minimum;
    }

    set minimum(val: number) {
        if (typeof val !== 'number' || isNaN(val)) throw new Error('Minimum must be a real number, not: ' + val);
        this._minimum = val;
    }

    /**
     * Gets or sets the maximum value allowed for the figure parameter.
     */
    get maximum(): number {
        return this._maximum;
    }

    set maximum(val: number) {
        if (typeof val !== 'number' || isNaN(val)) throw new Error('Maximum must be a real number, not: ' + val);
        this._maximum = val;
    }

    /**
     * This static function gets a FigureParameter for a particular figure name.
     * @param {String} figurename
     * @param {number} index, currently must be either 0 or 1
     * @return {FigureParameter}
     */
    public static getFigureParameter(figurename: string, index: number): FigureParameter | null {
        // const arr = (go.Shape as any)['_FigureParameters'][figurename];
        const arr = FigureParameter.definedParameters[figurename];
        if (!arr) return null;
        return arr[index];
    }

    /**
     * This static function sets a FigureParameter for a particular figure name.
     * @param {String} figurename
     * @param {number} index, currently must be either 0 or 1
     * @param {FigureParameter} figparam
     */
    public static setFigureParameter(figurename: string, index: number, figparam: FigureParameter) {
        if (!(figparam instanceof FigureParameter)) throw new Error('Third argument to FigureParameter.setFigureParameter is not FigureParameter: ' + figparam);
        if (figparam.defaultValue < figparam.minimum || figparam.defaultValue > figparam.maximum) {
            throw new Error('defaultValue must be between minimum and maximum, not: ' + figparam.defaultValue);
        }
        // const paramObj = (go.Shape as any)['_FigureParameters'];
        // let arr = paramObj[figurename];
        let arr: Array<FigureParameter> = FigureParameter.definedParameters[figurename];
        if (!arr) {
            // arr = [];
            // paramObj[figurename] = arr;
            arr = [];
            FigureParameter.definedParameters[figurename] = arr;
        }
        arr[index] = figparam;
    }
}

FigureParameter.setFigureParameter('ThinX', 0, new FigureParameter('Thickness', 10));
go.Shape.defineFigureGenerator('ThinX', (shape, w, h) => {
    let param1 = shape ? shape.parameter1 : NaN;
    if (isNaN(param1) || param1 < 0) param1 = 10;

    const geo = new go.Geometry();
    const fig = new go.PathFigure(0.1 * w, 0, true);
    geo.add(fig);
    fig.add(new go.PathSegment(go.PathSegment.Line, 0.5 * w, 0.4 * h));
    fig.add(new go.PathSegment(go.PathSegment.Line, 0.9 * w, 0));
    fig.add(new go.PathSegment(go.PathSegment.Line, w, 0.1 * h));
    fig.add(new go.PathSegment(go.PathSegment.Line, 0.6 * w, 0.5 * h));
    fig.add(new go.PathSegment(go.PathSegment.Line, w, 0.9 * h));
    fig.add(new go.PathSegment(go.PathSegment.Line, 0.9 * w, h));
    fig.add(new go.PathSegment(go.PathSegment.Line, 0.5 * w, 0.6 * h));
    fig.add(new go.PathSegment(go.PathSegment.Line, 0.1 * w, h));
    fig.add(new go.PathSegment(go.PathSegment.Line, 0, 0.9 * h));
    fig.add(new go.PathSegment(go.PathSegment.Line, 0.4 * w, 0.5 * h));
    fig.add(new go.PathSegment(go.PathSegment.Line, 0, 0.1 * h).close());
    return geo;
});
