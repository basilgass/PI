/**
 * Polynom module contains everything necessary to handle polynoms.
 * @module Polynom
 */

import {Monom} from './monom';
import {Shutingyard} from '../shutingyard';
import {Numeric} from '../numeric';
import {Fraction} from '../coefficients/fraction';

/**
 * Polynom class can handle polynoms, reorder, resolve, ...
 */
export class Polynom {
    private _rawString: string;
    private _monoms: Monom[];
    private _factors: Polynom[];
    private _texString: string;

    /**
     *
     * @param {string} polynomString (optional) Default polynom to parse on class creation
     */
    constructor(polynomString?: string) {
        this._monoms = [];
        this._factors = [];
        if (polynomString !== undefined) {
            this.parse(polynomString);
        }
        return this;
    }

    get isPolynom() {
        return true;
    };


    // ------------------------------------------
    // Getter and setter
    // ------------------------------------------
    get monoms() {
        return this._monoms;
    }

    set monoms(M: Monom[]) {
        this._monoms = M;
    }

    get factors(): Polynom[] {
        return this._factors;
    }

    set factors(value: Polynom[]) {
        this._factors = value;
    }

    get texString(): string {
        return this._texString;
    }

    get length() {
        // TODO: Must reduce the monoms list to remove the zero coefficient.
        return this._monoms.length;
    }

    get display(): string {
        return this.genDisplay();
    }

    get raw(): string {
        return this._rawString
    }

    get tex(): string {
        return this.genDisplay('tex');
    }

    get isMultiVariable(): boolean {
        const B = false;
        for (const m of this._monoms) {
            if (m.variables.length > 1) {
                return true;
            }
        }
        return B;
    }

    get variables(): string[] {
        let V: string[] = [];

        for (const m of this._monoms) {
            V = V.concat(m.variables);
        }

        // Remove duplicates.
        V = [...new Set(V)];

        return V;
    }

    get numberOfVars(): number {
        return this.variables.length;
    }

    private genDisplay = (output?: string, forceSign?: boolean, wrapParentheses?: boolean): string => {
        let P: string = '';

        for (const k of this._monoms) {
            if (k.coefficient.value === 0) {
                continue;
            }

            P += `${(k.coefficient.sign() === 1 && (P !== '' || forceSign === true)) ? '+' : ''}${(output === 'tex') ? k.tex : k.display}`;
        }

        if (wrapParentheses === true && this.length > 1) {
            if (output === 'tex') {
                P = `\\left( ${P} \\right)`;
            } else {
                P = `(${P})`;
            }
        }

        if (P === '') {
            P = '0';
        }
        return P;
    };


    // ------------------------------------------
    // Creation / parsing functions
    // ------------------------------------------
    /**
     * Parse a string to a polynom.
     * @param inputStr
     * @param values: as string, numbers or fractions
     */
    parse = (inputStr: string, ...values: any[]): Polynom => {
        if (values === undefined || values.length === 0) {
            // Parse the polynom using the shuting yard algorithm

            // TODO: handle if the inputstr is a number.
            inputStr = ''+inputStr;

            this._rawString = inputStr;

            return this.shutingYardToReducedPolynom(inputStr);
        } else if (/^[a-z]/.test(inputStr)) {
            // We assume the inputStr contains only letters.
            this.empty();

            let fractions = values.map(x => new Fraction(x));
            // Multiple setLetter version
            if (inputStr.length > 1) {
                // TODO: check that the number of values given correspond to the letters (+1 eventually)
                let letters = inputStr.split(''),
                    i = 0;
                for (let F of fractions) {
                    let m = new Monom();
                    m.coefficient = F.clone();
                    m.literalStr = letters[i] || '';
                    this.add(m);
                    i++;
                }
            }
            // Single setLetter version
            else {
                let n = fractions.length - 1;
                for (let F of fractions) {
                    let m = new Monom()
                    m.coefficient = F.clone();
                    m.literalStr = `${inputStr}^${n}`
                    this.add(m);
                    n--;
                }
            }
            return this;
        } else {
            return this.zero();
        }

    };

    /**
     * Main parse using a shutting yard class
     * @param inputStr
     */
    private shutingYardToReducedPolynom = (inputStr: string): Polynom => {
        // Get the RPN array of the current expression
        const SY: Shutingyard = new Shutingyard().parse(inputStr);
        const rpn: string[] = SY.rpn;
        const m: Polynom[] = [];
        let m1: Polynom;
        let m2: Polynom;
        let tokenParam: number = null;

        for (const token of rpn) {
            if (SY.isOperation(token)) {
                // Polynom
                m2 = (m.pop()) || new Polynom().zero();

                if (m.length > 0) {
                    // Get the first item from the stack
                    m1 = (m.pop()) || new Polynom().zero();
                } else {
                    // Nothing is in the stack - create an empty polynom
                    m1 = new Polynom().zero();
                }

                if (token[0] === '^') {
                    tokenParam = parseInt(token.split('^')[1]);
                }

                switch (token) {
                    case '+':
                        m1.add(m2);
                        break;
                    case '-':
                        m1.subtract(m2);
                        break;
                    case '*':
                        m1.multiply(m2);
                        break;
                    // TODO: Shuting yard to polynom divide.
                    // case '/': console.log(m1.display, m2.display);m1.divide(m2); break;
                    // By default, all not operation value are converted to polynom. Therefore, the pow value must be converted to an integer.
                    // TODO: Shuting yard to polynom pow : case '^': m1.pow(+m2.monoms[0].coefficient.numerator); break;
                    default:
                        if (tokenParam !== null) {
                            if (token[0] === '^') {
                                m1 = m2.clone().pow(tokenParam);
                            }
                        } else {
                            console.log('Token not recognized in shuting yard to reduce polynom: ', token);
                        }
                }
                m.push(m1);
            } else {
                m.push(new Polynom().add(new Monom(token)));
            }
        }

        this._monoms = m[0].monoms;
        return this;
    }

    /**
     * Clone the polynom
     */
    clone = (): Polynom => {
        const P = new Polynom();
        const M: Monom[] = [];

        for (const m of this._monoms) {
            M.push(m.clone());
        }

        P.monoms = M;
        return P;
    };

    /**
     * Set the polynom to zero.
     * @returns {this}
     */
    zero = (): Polynom => {
        this._monoms = [];
        this._monoms.push(new Monom().zero());
        this._rawString = '0';
        return this;
    };

    one = (): Polynom => {
        this._monoms = [];
        this._monoms.push(new Monom().one());
        this._rawString = '1';
        return this;
    }

    empty = (): Polynom => {
        this._monoms = [];
        this._rawString = '';
        return this;
    };

    // -----------------------------------------------
    // Polynom generators and randomizers
    // -----------------------------------------------
    private _randomizeDefaults: { [key: string]: number | string | boolean } = {
        degree: 2,
        unit: true,
        fractions: false,
        factorable: false,
        letters: 'x',
        allowNullMonom: false,
        numberOfMonoms: false
    };
    get randomizeDefaults(): { [key: string]: number | string | boolean } {
        return this._randomizeDefaults;
    }

    set randomizeDefaults(value) {
        this._randomizeDefaults = value;
    }

    randomize = (config: { [key: string]: number | string | boolean }): Polynom => {
        let P = new Polynom();

        // Check the config file and use the default values.
        if (config === undefined) {
            config = {};
        }
        for (let k in this._randomizeDefaults) {
            if (config[k] === undefined) {
                config[k] = this._randomizeDefaults[k];
            }
        }

        // TODO: Build a more robust randomize function

        return P;
    }


    // TODO: Remove rndSimple and rndFactorable.
    /**
     * Polynom generator
     * @param degree
     * @param unit
     * @param withFraction
     * @param letters
     * @param allowZero
     * @param numberOfMonoms
     */
    rndSimple = (degree: number = 1, unit: boolean = false, withFraction: boolean = false, letters: string = 'x', allowZero: boolean = true, numberOfMonoms: number = -1): Polynom => {
        // TODO: Make rndSimple polynom generator more user friendly
        // If the current polynom (this) is already created, initialise it!
        this.empty();

        let M: Monom;
        for (let i = degree; i >= 0; i--) {
            M = new Monom().random(letters, i, withFraction, (i === degree) ? false : allowZero);

            // We want to have the greatest degree monom coefficient to be unit.
            if (unit && i === degree) {
                M.coefficient = new Fraction().one();
            }
            this.add(M);
        }

        // Remove randomly the monoms to match the number of monoms.
        if (numberOfMonoms > 0 && numberOfMonoms < this.length) {
            this.reorder();
            // Keep the greatest degree monom.
            // But remove randomly the next monoms.
            while (this.length > numberOfMonoms) {
                this._monoms.splice(Numeric.randomInt(1, this.length - 1), 1);
            }
        }
        return this;
    };

    rndFactorable = (degree: number = 2, unit: boolean | number = false, letters: string = 'x'): Polynom => {
        // TODO: Make rndFactorable polynom generator more user friendly
        this._factors = [];
        for (let i = 0; i < degree; i++) {
            let factorUnit = unit === true || i >= unit,
                p = new Polynom().rndSimple(1, factorUnit, false, letters);

            this._factors.push(p);
        }

        this.empty().monoms = this._factors[0].monoms;
        for (let i = 1; i < this._factors.length; i++) {
            this.multiply(this._factors[i]);
        }
        return this;
    };

    // ------------------------------------------
    // Mathematical operations
    // ------------------------------------------
    opposed = (): Polynom => {
        this._monoms = this._monoms.map(m => m.opposed());
        return this;
    };

    add = (...values: any[]): Polynom => {

        for (let value of values) {
            if (value.isPolynom) {
                this._monoms = this._monoms.concat(value.monoms);
            } else if (value.isMonom) {
                this._monoms.push(value.clone());
            } else if (Number.isSafeInteger(value)) {
                this._monoms.push(new Monom(value.toString()));
            } else {
                this._monoms.push(new Monom(value));
            }
        }

        return this.reduce();
    };

    subtract = (...values: any[]): Polynom => {

        for (let value of values) {
            if (value.isPolynom) {
                this._monoms = this._monoms.concat(value.clone().opposed().monoms);
            } else if (value.isMonom) {
                this._monoms.push(value.clone().opposed());
            } else if (Number.isSafeInteger(value)) {
                this._monoms.push(new Monom(value.toString()).opposed());
            } else {
                this._monoms.push(new Monom(value).opposed());
            }
        }

        return this.reduce();
    };

    multiply = (value: any): Polynom => {
        if (value.isPolynom) {
            return this.multiplyByPolynom(value);
        } else if (value.isFraction) {
            return this.multiplyByFraction(value);
        } else if (value.isMonom) {
            return this.multiplyByMonom(value);
        } else if (Number.isSafeInteger(value)) {
            return this.multiplyByInteger(value);
        }

        // Something went wrong...
        return this;
    }

    private multiplyByPolynom = (P: Polynom): Polynom => {
        const M: Monom[] = [];
        for (const m1 of this._monoms) {
            for (const m2 of P.monoms) {
                M.push(Monom.xmultiply(m1, m2));
            }
        }

        this._monoms = M;
        return this.reduce();
    };

    private multiplyByFraction = (F: Fraction): Polynom => {
        for (const m of this._monoms) {
            m.coefficient.multiply(F);
        }

        return this.reduce();
    };

    private multiplyByInteger = (nb: number): Polynom => {
        return this.multiplyByFraction(new Fraction(nb));
    };

    private multiplyByMonom = (M: Monom): Polynom => {
        for (const m of this._monoms) {
            m.multiply(M)
        }
        return this.reduce();
    };

    /**
     * Divide the current polynom by another polynom.
     * @param P
     * returns {quotient: Polynom, reminder: Polynom}
     */
    euclidian = (P: Polynom): { quotient: Polynom, reminder: Polynom } => {
        const quotient: Polynom = new Polynom().zero();
        const reminder: Polynom = this.clone();
        const maxMP: Monom = P.monomByDegree();
        let newM: Monom;

        // Make the euclidian division of the two polynoms.
        while (reminder.degree() >= P.degree()) {
            // Get the greatest monom divided by the max monom of the divider
            newM = reminder.monomByDegree().clone().divide(maxMP);

            if (newM.isZero()) {
                break;
            }

            // Get the new quotient and reminder.
            quotient.add(newM);
            reminder.subtract(P.clone().multiply(newM));
        }

        return {quotient, reminder};
    };

    divide = (value: any): Polynom => {
        if (value.isFraction) {
            this.divideByFraction(value);
        } else if (Number.isSafeInteger(value)) {
            return this.divideByInteger(value);
        }
    }

    private divideByInteger = (nb: number): Polynom => {
        const nbF = new Fraction(nb);
        for (const m of this._monoms) {
            m.coefficient.divide(nbF);
        }
        return this;
    };

    private divideByFraction = (F: Fraction): Polynom => {
        for (const m of this._monoms) {
            m.coefficient.divide(F);
        }
        return this;
    };

    pow = (nb: number): Polynom => {
        if (!Number.isSafeInteger(nb)) {
            return this.zero();
        }
        if (nb < 0) {
            return this.zero();
        }
        if (nb === 0) {
            return new Polynom();
        }

        const P = this.clone();
        for (let i = 1; i < nb; i++) {
            this.multiply(P);
        }
        return this.reduce();
    };


    // ------------------------------------------
    // Compare functions
    // ------------------------------------------
    /**
     * Compare the current coefficient with another coefficient
     * @param F (Coefficient) The coefficient to compare
     * @param sign (string| default is =): authorized values: =, <, <=, >, >= with some variations.
     */
    compare = (P: Polynom, sign?: string): boolean => {
        if (sign === undefined) {
            sign = '='
        }

        // Create clone version to reduce them without altering the original polynoms.
        const cP1 = this.clone().reduce().reorder();
        const cP2 = P.clone().reduce().reorder();

        switch (sign) {
            case '=':
                // They must have the isSame length and the isSame degree
                if (cP1.length !== cP2.length || cP1.degree() !== cP2.degree()) {
                    return false;
                }

                // Check if the coefficients are the isSame.
                for (const i in cP1.monoms) {
                    if (!cP1.monoms[i].isEqual(cP2.monoms[i])) {
                        return false;
                    }
                }
                return true;
            case 'same':
                // They must have the isSame length and the isSame degree
                if (cP1.length !== cP2.length || cP1.degree() !== cP2.degree()) {
                    return false;
                }

                for (const i in cP1.monoms) {
                    if (!cP1.monoms[i].isSameAs(cP2.monoms[i])) {
                        return false;
                    }
                }
            default:
                return false;
        }
    };

    isZero(): boolean {
        return (this._monoms.length === 1 && this._monoms[0].coefficient.isZero()) || this._monoms.length === 0;
    }

    isOne(): boolean {
        return this._monoms.length === 1 && this._monoms[0].coefficient.isOne();
    }

    isEqual = (P: Polynom): boolean => {
        return this.compare(P, '=');
    };

    isSameAs = (P: Polynom): boolean => {
        return this.compare(P, 'same');
    };

    isOpposedAt = (P: Polynom): boolean => {
        return this.compare(P.opposed(), '=');
    };

    // ------------------------------------------
    // Misc polynoms functions
    // -------------------------------------
    reduce = (): Polynom => {
        for (let i = 0; i < this._monoms.length; i++) {
            for (let j = i + 1; j < this._monoms.length; j++) {
                if (this._monoms[i].isSameAs(this.monoms[j])) {
                    this._monoms[i].add(this.monoms[j]);
                    this._monoms.splice(j, 1);
                }
            }
        }

        // Remove all null monoms
        this._monoms = this._monoms.filter((m) => {
            return m.coefficient.value !== 0
        });

        // Reduce all monoms coefficient.
        for (const m of this._monoms) {
            m.coefficient.reduce();
        }

        if (this.length === 0) {
            return new Polynom().zero();
        }
        return this;
    };

    reorder = (letter: string = 'x'): Polynom => {
        // TODO: Must handle multiple setLetter reorder system
        this._monoms.sort(function (a, b) {
            return b.degree(letter) - a.degree(letter)
        });
        return this.reduce();
    };

    degree = (letter?: string): number => {
        let d: number = 0;
        for (const m of this._monoms) {
            d = Math.max(m.degree(letter), d);
        }
        return d;
    };

    letters = (): string[] => {
        let L:string[] = [], S = new Set();

        for(let m of this._monoms){
            S = new Set([...S, ...m.variables]);
        }

        // @ts-ignore
        return [...S];
    }

    /**
     * Replace a variable (letter) by a polynom.
     * @param letter
     * @param P
     */
    replaceBy = (letter: string, P: Polynom): Polynom => {
        let pow: number;
        const resultPolynom: Polynom = new Polynom().zero();

        for (const m of this.monoms) {
            if (m.literal[letter] === undefined || m.literal[letter] === 0) {
                resultPolynom.add(m.clone());
            } else {
                // We have found a setLetter.
                // Get the power and reset it.
                pow = +m.literal[letter];
                delete m.literal[letter];

                resultPolynom.add(P.clone().pow(pow).multiply(m));
            }
        }

        this._monoms = resultPolynom.reduce().reorder().monoms;
        return this;
    };

    // Evaluate a polynom.
    evaluate = (values: { [key: string]: Fraction }): Fraction => {
        const r = new Fraction().zero();

        this._monoms.forEach(monom => {
            //console.log('Evaluate polynom: ', monom.display, values, monom.evaluate(values).display);
            r.add(monom.evaluate(values));
        });
        return r;
    };

    derivative = (letter?: string): Polynom => {
        let dP = new Polynom();

        for (let m of this._monoms) {
            dP.add(m.derivative(letter));
        }

        return dP;

    }

    // ------------------------------------------
    // Polynoms factorization functions
    // -------------------------------------
    /**
     * Factorize a polynom and store the best results in factors.
     * @param maxValue Defines the greatest value to search to (default is 20).
     */
    factorize = (maxValue?: number): Polynom => {
        // TODO: Must handle other letters than 'x'
        this._factors = [];

        // Duplicate the polynom
        let P = this.clone(),
            nbFactorsFound = 0;

        // Determine if the polynom is "negative", eg has a max monom degree with a negative coefficient.
        if (P.monomByDegree().coefficient.numerator < 0) {
            this._factors.push(new Polynom('-1'));
        }

        // Determine if there is a 'common' monom
        let M = P.commonMonom();
        if (!M.isOne()) {
            let commonPolynom = new Polynom()
            commonPolynom.monoms = [M]
            if (this._factors.length === 0) {
                this._factors.push(commonPolynom);
            } else {
                this._factors = [];
                this._factors.push(commonPolynom.opposed());
            }
            P = P.euclidian(commonPolynom).quotient;

            nbFactorsFound = commonPolynom.degree();
        }

        // Main loop. Do it only if degree is equal or less than one.
        if (P.degree() <= 1) {
            this._factors.push(P.clone());
        } else {
            // Force test.
            let Q = new Fraction(),
                F,
                degree = P.degree();

            maxValue = maxValue === undefined ? 20 : maxValue;

            // Test all polynom similar to ax+b
            for (let a = 1; a <= maxValue; a++) {
                // Skip a coefficient of 0
                for (let b = -maxValue; b <= maxValue; b++) {

                    Q.parse(-b, a);

                    if (P.evaluate({x: Q})) {
                        F = new Polynom(`${a}x+${b}`);
                        while (P.evaluate({x: Q}).value === 0) {
                            this._factors.push(F.clone());
                            nbFactorsFound++;

                            // Means it can be divided without reminders.
                            P = P.euclidian(F).quotient;
                        }
                    }

                    // Continue if the numbers of factors found equals the degree.
                    if (nbFactorsFound > degree) {
                        return this;
                    }
                }
            }

            if (P.degree() > 1) {
                this._factors.push(P.clone());
                return this;
            }
        }

        return this;
    };


    // ------------------------------------------
    // Polynoms helpers functions
    // -------------------------------------
    // TODO: get zeroes for more than first degree
    getZeroes = (): (Fraction | boolean)[] => {
        const Z: Fraction[] = [];

        switch (this.degree()) {
            case 0:
                if (this._monoms[0].coefficient.value === 0) {
                    return [true];
                } else {
                    return [false];
                }
            case 1:
                // There is only one monoms,
                if (this._monoms.length === 1) {
                    return [new Fraction().zero()];
                } else {
                    const P = this.clone().reduce().reorder();
                    return [P.monoms[1].coefficient.opposed().divide(P.monoms[0].coefficient)];
                }
            // TODO: Determine the zeros of an equation of second degree.
            //case 2:
            default:
                // Make sure the polynom is factorized.
                if (this._factors.length === 0) {
                    this.factorize()
                }

                let zeroes = [], zeroesAsTex = [];
                for (let P of this._factors) {
                    if (P.degree() > 2) {
                        // TODO: Handle other polynom.

                    } else if (P.degree() === 2) {
                        let A = P.monomByDegree(2).coefficient,
                            B = P.monomByDegree(1).coefficient,
                            C = P.monomByDegree(0).coefficient,
                            D = B.clone().pow(2).subtract(A.clone().multiply(C).multiply(4));

                        if (D.value > 0) {
                            /*console.log('Two zeroes for ', P.tex); */
                            let x1 = (-(B.value) + Math.sqrt(D.value)) / (2 * A.value),
                                x2 = (-(B.value) - Math.sqrt(D.value)) / (2 * A.value);

                            zeroes.push(new Fraction(x1.toFixed(3)).reduce());
                            zeroes.push(new Fraction(x2.toFixed(3)).reduce());
                        } else if (D.value === 0) {
                            /*console.log('One zero for ', P.tex); */

                        } else {
                            console.log('No zero for ', P.tex);
                        }
                    } else {
                        for (let z of P.getZeroes()) {
                            // Check if the zero is already in the list.
                            if (z === false || z === true) {
                                continue;
                            }
                            if (zeroesAsTex.indexOf(z.frac) === -1) {
                                zeroes.push(z);
                                zeroesAsTex.push(z.frac);
                            }
                        }
                    }
                }
                return zeroes;
        }
        return Z;
    };


    // TODO: analyse the next functions to determine if they are useful or not...
    monomByDegree = (degree?: number, letter?: string): Monom => {
        if (degree === undefined) {
            // return the highest degree monom.
            return this.monomByDegree(this.degree(letter));
        }

        // Reduce the polynom.
        const M = this.clone().reduce();
        for (const m of M._monoms) {
            if (m.degree(letter) === degree) {
                return m.clone();
            }
        }

        // Nothing was found - return the null monom.
        return new Monom().zero();
    };

    // Used in LinearSystem.tex
    monomByLetter = (letter: string): Monom => {
        const M = this.clone().reduce();
        for (const m of M._monoms) {
            if (m.hasLetter(letter)) {
                return m.clone();
            }
        }

        return new Monom().zero();
    };


    // Next functions are used for for commonMonom, which is used in the factorize method.
    getDenominators = (): number[] => {
        const denominators: number[] = [];
        for (const m of this._monoms) {
            denominators.push(m.coefficient.denominator);
        }
        return denominators;
    };

    getNumerators = (): number[] => {
        const numerators: number[] = [];
        for (const m of this._monoms) {
            numerators.push(m.coefficient.numerator);
        }
        return numerators;
    };

    lcmDenominator = (): number => {
        return Numeric.lcm(...this.getDenominators());
    };

    gcdDenominator = (): number => {
        return Numeric.gcd(...this.getDenominators());
    };

    lcmNumerator = (): number => {
        return Numeric.lcm(...this.getNumerators());
    };

    gcdNumerator = (): number => {
        return Numeric.gcd(...this.getNumerators());
    };

    commonMonom = (): Monom => {
        let M = new Monom().one(), numerator: number, denominator: number, degree = this.degree();

        numerator = this.gcdNumerator();
        denominator = this.gcdDenominator();

        M.coefficient = new Fraction(numerator, denominator);
        for (let L of this.variables) {
            // Initialize the setLetter with the max degree
            M.setLetter(L, degree);
            for (let m of this._monoms) {
                M.setLetter(L, Math.min(m.degree(L), M.degree(L)));
                if (M.degree(L) === 0) {
                    break;
                }
            }
        }
        return M;
    }


    // TODO: The rest of the functions are not used or unnecessary ?
    /**
     * This will generate a not reduced tex string of the polynom.
     * @param complexity : Number of iteration to increase the complexity.
     */
    makeItComplicate = (complexity: number = 1): Polynom => {
        this._texString = '';

        // The polynom must be at least of the first degree.
        if (this.degree() < 1) {
            return this;
        }

        const mDegree = Numeric.randomInt(0, this.degree() - 1);
        const A = new Polynom().rndSimple(mDegree, false, complexity > 1, 'x', false, complexity > 1 ? -1 : 1);
        const B = new Polynom().rndSimple(1, false, complexity > 1);
        const C = this.clone().subtract(A.clone().multiply(B));

        // Try to factorize a little bit the C polynom.
        C.factorizePartial(true);
        this._texString = `${A.genDisplay('tex', false, true)} \\cdot ${B.genDisplay('tex', false, true)} ${C.texString} `;

        return this;
    };
    factorizePartial = (forceSign?: boolean): Polynom => {
        this._texString = '';
        // Try to find two monoms with a common coefficient.
        if (this.length <= 1) {
            return this;
        }

        let mMain: Monom,
            mCheck: Monom,
            mFactor: Monom,
            pFactor: Polynom,
            // pRemain: Polynom,
            g: number, sign: string;

        for (let i = 0; i < this.length; i++) {
            mMain = this._monoms[i].clone();
            // We factorize only if the main coefficient isn't a fraction
            // if(mMain.coefficient.denominator!==1){continue;}
            for (let j = i + 1; j < this.length; j++) {
                mCheck = this._monoms[j].clone();
                // if(mCheck.coefficient.denominator!==1){continue;}

                g = Numeric.gcd(mMain.coefficient.numerator, mCheck.coefficient.numerator);
                if (g !== 1) {
                    // mFactor = mMain.clone().divide(mCheck); // This gets the literal part.
                    // mFactor.coefficient = new Fraction(g); // Set the coefficient to the gcd.
                    mFactor = Monom.lcm(mMain, mCheck);
                    sign = mMain.coefficient.sign() === 1 ? '+' : '-';
                    this._texString = `${forceSign === true ? sign : (sign === '+' ? '' : sign)}${mFactor.tex}`;

                    pFactor = new Polynom().add(mMain.divide(mFactor)).add(mCheck.divide(mFactor));
                    this._texString += pFactor.genDisplay('tex', false, true);

                    this._texString += this.clone().subtract(pFactor.clone().multiply(mFactor)).genDisplay('tex', true, false);
                    return this;
                }
            }
        }

        this._texString = this.genDisplay('tex', forceSign);

        return this;
    };
    /**
     * reduce the coefficient value as if the polynom was equal to zero.
     */
    minify = (): Polynom => {
        // First multiply by the common denominator.
        this.multiply(this.lcmDenominator()).divide(this.gcdNumerator()).reduce();
        return this.reduce();
    };
    /**
     * Determine if the current polynom is divisible by P
     * TODO: should work with any polynom, not only first degree polynoms and the setLetter should disappear
     * @param P
     * @param letter - default setLetter
     */
    canDivide = (P: Polynom, letter: string = 'x'): boolean => {
        const d = P.degree();

        const evalValue: { [key: string]: Fraction } = {};
        // A zero degree polynom can always divide, except if it's the zero polynom.
        if (d === 0) {
            return !P.isZero;
        }

        // The polynom is of degree one.
        if (d === 1) {
            const z = P.getZeroes();
            // The zero is an undefined zero.
            if (z[0] === true || z[0] === false) {
                return false;
            }

            evalValue[letter] = z[0];
            return this.evaluate(evalValue).value === 0;
        }

        // The polynom is of degree 2 or more...
        if (d > 1) {
            console.log('Currently, only first degree polynom are supported');
            return false;
        }

        return false;
    };


}
