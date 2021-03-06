import {Numeric} from "../numeric";

export class Fraction {
    private _numerator: number;
    private _denominator: number;

    constructor(value?: any, denominatorOrPeriodic?: number) {
        this._numerator = 1;
        this._denominator = 1;

        if (value !== undefined) {
            this.parse(value, denominatorOrPeriodic);
        }

        return this;
    }

    get isFraction() {
        return true;
    }

    // ------------------------------------------
    // Getter and setter
    // ------------------------------------------

    get numerator(): number {
        return this._numerator;
    }

    set numerator(value: number) {
        this._numerator = value;
    }

    get denominator(): number {
        return this._denominator;
    }

    set denominator(value: number) {
        this._denominator = value;
    }

    get value(): number {
        return this._numerator / this._denominator;
    }

    // Display getter
    get tex(): string {
        if (this._denominator === 1) {
            return `${this._numerator}`;
        } else if (this._numerator < 0) {
            return `-\\frac{ ${-this._numerator} }{ ${this._denominator} }`;
        } else {
            return `\\frac{ ${this._numerator} }{ ${this._denominator} }`;
        }
    }

    get display(): string {
        if (this._denominator === 1) {
            return `${this._numerator}`;
        } else {
            return `${this._numerator}/${this._denominator}`;
        }
    }

    // Helper function to display fractions
    get frac(): string {
        return this.tex;
    }

    get dfrac(): string {
        return this.tex.replace('\\frac', '\\dfrac');
    }

    // ------------------------------------------
    // Creation / parsing functions
    // ------------------------------------------
    /**
     * Parse the value to get the numerator and denominator
     * @param value : number or string to parse to get the fraction
     * @param denominatorOrPeriodic (optional|number) : length of the periodic part: 2.333333 => 1 or denominator value
     */
    parse = (value: any, denominatorOrPeriodic?: number): Fraction => {
        let S: string[];

        // A null value means a zero fraction.
        if (value === null) {
            this._numerator = 0;
            this._denominator = 1;
            return this;
        }

        switch (typeof value) {
            case "string":
                // Split the sting value in two parts: Numerator/Denominator
                S = value.split('/');

                if (S.length === 1) {
                    // No divide sign
                    return this.parse(+S[0]);
                } else if (S.length === 2) {
                    // One divide signe
                    // We check if the denominator is zero
                    if (S[1] === '0') {
                        this._numerator = NaN;
                        this._denominator = 1;
                    } else {
                        this._numerator = +S[0];
                        this._denominator = +S[1];
                    }
                } else {
                    // More than one divide sign ?
                    this._numerator = NaN;
                    this._denominator = 1;
                }
                break;
            case "number":
                if (Number.isSafeInteger(value)) {
                    // The given value is an integer
                    this._numerator = +value;

                    if (denominatorOrPeriodic === undefined || !Number.isSafeInteger(denominatorOrPeriodic)) {
                        this._denominator = 1;
                    } else {
                        this._denominator = +denominatorOrPeriodic;
                    }
                } else {
                    // The given value is a float number

                    // Get the number of decimals after the float sign
                    let p: number = (value.toString()).split('.')[1].length;

                    // Transform the float number in two integer
                    if (denominatorOrPeriodic === undefined) {
                        this._numerator = value * Math.pow(10, p);
                        this._denominator = Math.pow(10, p);
                    } else if (Number.isSafeInteger(denominatorOrPeriodic)) {
                        this._numerator = value * Math.pow(10, p) - Math.floor(value * Math.pow(10, p - denominatorOrPeriodic));
                        this.denominator = Math.pow(10, p) - Math.pow(10, p - denominatorOrPeriodic)
                    }
                }
                break;
            case "object":
                if (value.isFraction) {
                    this._numerator = +value.numerator;
                    this._denominator = +value.denominator;
                }
                break;
        }
        return this;
    };

    clone = (): Fraction => {
        let F = new Fraction();
        F.numerator = +this._numerator;
        F.denominator = +this._denominator;
        return F;
    };

    zero = (): Fraction => {
        this._numerator = 0;
        this._denominator = 1;
        return this;
    };

    one = (): Fraction => {
        this._numerator = 1;
        this._denominator = 1;
        return this;
    };

    infinite = (): Fraction => {
        this._numerator = Infinity;
        this._denominator = 1;
        return this;
    };

    invalid = (): Fraction => {
        this._numerator = NaN;
        this._denominator = 1;
        return this;
    };

    // ------------------------------------------
    // Mathematical operations
    // ------------------------------------------
    opposed = (): Fraction => {
        this._numerator = -this._numerator;
        return this;
    };

    add = (F: Fraction): Fraction => {
        let N: number = this._numerator,
            D: number = this._denominator;

        this._numerator = N * F.denominator + F.numerator * D;
        this._denominator = D * F.denominator;

        return this.reduce();
    };

    subtract = (F: Fraction): Fraction => {
        return this.add(F.clone().opposed());
    };

    multiply = (F: Fraction | number): Fraction => {
        // Parse the value.
        // If it's a fraction, return a clone of it
        // If it's an integer, return the fraction F/1
        let Q = new Fraction(F);

        this._numerator = this._numerator * Q.numerator;
        this._denominator = this._denominator * Q.denominator;

        return this.reduce();
    };

    divide = (F: Fraction | number): Fraction => {
        let Q = new Fraction(F);

        if (Q.numerator === 0) {
            return new Fraction().infinite();
        }

        let N: number = +this._numerator,
            D: number = +this._denominator;

        this._numerator = N * Q.denominator;
        this._denominator = D * Q.numerator;
        return this.reduce();
    };

    invert = (): Fraction => {
        let n = +this._numerator, d = +this._denominator;
        this._numerator = d;
        this._denominator = n;

        return this;
    }
    pow = (p: number): Fraction => {
        if (!Number.isSafeInteger(p)) {
            return this.invalid();
        }
        this.reduce();

        if (p < 0) {
            this.invert()
        }

        this._numerator = this._numerator ** Math.abs(p);
        this._denominator = this._denominator ** Math.abs(p);
        return this;
    };

    root = (p: number): Fraction => {
        // TODO: nth - root of a fraction => this will return another type of coefficient.

        // Check if they are perfect roots..
        if (p === 0) {
            return this;
        }

        // If negative, invert the fraction
        if (p < 0) {
            this.invert()
        }

        let n = Math.pow(this._numerator, Math.abs(1 / p)),
            d = Math.pow(this._denominator, Math.abs(1 / p));

        this._numerator = Math.pow(this._numerator, Math.abs(1 / p));
        this._denominator = Math.pow(this._denominator, Math.abs(1 / p));
        return this;
    }

    sqrt = (): Fraction => {
        return this.root(2);
    }

    abs = (): Fraction => {
        this._numerator = Math.abs(this._numerator);
        this._denominator = Math.abs(this._denominator);
        return this;
    };

    // ------------------------------------------
    // Mathematical operations specific to fractions
    // ------------------------------------------
    reduce = (): Fraction => {
        let g = Numeric.gcd(this._numerator, this._denominator);
        this._numerator = this._numerator / g;
        this._denominator = this._denominator / g;

        if (this._denominator < 0) {
            this._denominator = -this._denominator;
            this._numerator = -this._numerator;
        }
        return this;
    };

    amplify = (k: number): Fraction => {
        if (Number.isSafeInteger(k)) {
            this._numerator *= k;
            this._denominator *= k;
        }
        return this;
    };


    // ------------------------------------------
    // Compare functions
    // ------------------------------------------
    /**
     * Compare the current coefficient with another coefficient
     * @param F (Coefficient) The coefficient to compare
     * @param sign (string| default is =): authorized values: =, <, <=, >, >= with some variations.
     */
    compare = (F: Fraction, sign?: string): boolean => {
        if (sign === undefined) {
            sign = '=';
        }


        switch (sign) {
            case '>':
                return this.value > F.value;
            case ">=" || "=>" || "geq":
                return this.value >= F.value;
            case "<":
                return this.value < F.value;
            case "<=" || "=>" || "leq":
                return this.value <= F.value;
            case "=":
                // let F2: Fraction = F.clone().reduce(),
                //     F1: Fraction = this.clone().reduce();
                // return (F1.numerator === F2.numerator && F1.denominator === F2.denominator);
                return this.value === F.value;
            case "<>":
                return this.value !== F.value;
            default:
                return false;
        }
    };
    /* Compare shortcuts */
    lesser = (than: Fraction): Boolean => {
        return this.compare(than, '<');
    };
    leq = (than: Fraction): Boolean => {
        return this.compare(than, '<=');
    };
    greater = (than: Fraction): Boolean => {
        return this.compare(than, '>');
    };
    geq = (than: Fraction): Boolean => {
        return this.compare(than, '>=');
    };
    isEqual = (than: Fraction): boolean => {
        return this.compare(than, '=');
    }
    isDifferent = (than: Fraction): boolean => {
        return this.compare(than, '<>');
    }
    isOpposed = (p: Fraction): boolean => {
        return this.isEqual(p.clone().opposed());
    }
    isInverted = (p: Fraction): boolean => {
        return this.isEqual(new Fraction().one().divide(p.clone()));
    }
    isZero = (): boolean => {
        return this._numerator === 0;
    }
    isOne = (): boolean => {
        return this._numerator === 1 && this._denominator === 1;
    }
    isPositive = (): boolean => {
        return this.sign()===1;
    }
    isNegative = (): boolean => {
        return this.sign()===-1;
    }
    isNaN = (): boolean => {
        return isNaN(this._numerator);
    }
    isInfinity = (): boolean => {
        return this._numerator === Infinity;
    }
    isFinite = (): boolean => {
        return !this.isInfinity();
    }
    isSquare = (): boolean => {
        return Math.sqrt(this._numerator) % 1 === 0 && Math.sqrt(this._denominator) % 1 === 0
    }
    sign = (): number => {
        return (this._numerator * this._denominator >= 0) ? 1 : -1;
    };


    // TODO: The rest of the functions are not used or unnecessary ?
    /**
     * Simple function to determine if it's a fraction
     */
    areEquals = (...F: Fraction[]): boolean => {
        for (let i = 0; i < F.length; i++) {
            if (!this.isEqual(F[i])) {
                return false;
            }
        }
        return true;
    };
}