import { program } from "./program.js";

const print = console.log;

class RS3 {
    constructor(code) {
        this.code = code;
        this.dir = { hor: true, up: false, forward: true, advanceVer: 0, advanceHor: 0 };
        this.pattern = /p\d+[\w\W]*?q|[LFRP\)]\d*|\(/g;
        this.program = code.match(this.pattern) || '';
        this.defined = {};
        this.path = [['*']];
    }
    F(check) {
        let { hor, up, forward, advanceVer, advanceHor } = this.dir;
        if (hor) {
            if (forward) {
                advanceHor += 1;
                if (advanceHor in this.path[advanceVer]) this.path[advanceVer][advanceHor] = check;
                else this.path.forEach((elem, i) => elem.push(i == advanceVer ? check : ' '));
                this.dir.advanceHor = advanceHor;
            } else {
                advanceHor -= 1;
                if (advanceHor >= 0) this.path[advanceVer][advanceHor] = check;
                else this.path.forEach((elem, i) => elem.unshift(i == advanceVer ? check : ' '));
            }
            this.dir.advanceHor = advanceHor >= 0 ? advanceHor : 0;
        } else {
            if (up) {
                advanceVer -= 1;
                if (advanceVer >= 0) this.path[advanceVer][advanceHor] = check;
                else {
                    const step = new Array(this.path[0].length).fill(' ');
                    step[advanceHor] = check;
                    this.path.unshift(step);
                }
                this.dir.advanceVer = advanceVer >= 0 ? advanceVer : 0;
            } else { // iF DOWN IS TRUE
                advanceVer += 1;
                if (advanceVer in this.path) this.path[advanceVer][advanceHor] = check;
                else {
                    const step = new Array(this.path[0].length).fill(' ');
                    step[advanceHor] = check;
                    this.path.push(step);
                }
                this.dir.advanceVer = advanceVer;
            }
        }
    }
    R() {
        if (this.dir.hor) { this.dir.up = (this.dir.forward) ? false : true; this.dir.hor = false; }
        else { this.dir.forward = (this.dir.up) ? true : false; this.dir.hor = true; }
    }
    L() {
        if (this.dir.hor) { this.dir.up = (this.dir.forward) ? true : false; this.dir.hor = false; }
        else { this.dir.forward = (this.dir.up) ? false : true; this.dir.hor = true; }
    }
    del(last) {
        const arr = [];
        while (this.program.some(pro => pro.includes('q'))) {
            let index;
            for (const i in this.program)
                if (this.program[i].includes('q')) { index = i; break; }
            const [_, key, code] = this.program[index].match(/^(p\d+)([\w\W]*)q$/) || [];
            if (key.toUpperCase() in this.defined) throw new Error(`key already exists`);
            if (code.includes(key.toUpperCase())) throw new Error(`stack over flow`);
            this.defined[key.toUpperCase()] = code.match(this.pattern);
            this.program.splice(index, 1);
        }
        while (this.program.lastIndexOf(')0') >= 0) {
            last = this.program.lastIndexOf(')0');
            this.program[last] = ')';
            let start = last - 1; let count = 1;
            while (count) {
                if (start < 0) throw new Error(`no opening parentheses found for ")0"`);
                if (this.program[start].includes(')')) count++;
                if (this.program[start] == "(") count--;
                count && start--;
            }
            arr.push([start, last]);
        }
        arr.forEach(([start, last]) => this.program.splice(start, last - start + 1, ...' '.repeat(last - start + 1)));
        this.program = this.program.filter(elem => elem !== ' ');
        return this.program;
    }
    mutual(caller) {
        if (caller) {
            const calls = this.defined[caller].filter(elem => /P\d+/.test(elem));
            for (const call of calls) if (this.defined[call].includes(caller)) return true;
        }
        return false;
    }

    evaluate(index, caller, program = this.program, defined = this.defined) {
        let monitor, m, repCode;
        if (this.mutual(caller)) throw new Error(`mutual stack over flow`);
        for (monitor = index; monitor < program.length; monitor++) {
            const fn = program[monitor];
            if (/^\w/.test(fn)) {
                if (/P\d+/.test(fn)) this.evaluate(0, fn, this.defined[fn]);
                else if (fn.length == 1) this[fn.charAt(0)]('*');
                else for (let i = Number(fn.slice(1)); i > 0; i--) this[fn.charAt(0)]('*');
            }
            else {
                if (fn.charAt(0) == ')') return monitor; // OFFLOAD THE STACK
                else if (fn == '(') {
                    let count = monitor + 1;
                    while (program[count].charAt(0) != ')') {
                        count = this.evaluate(count, undefined, program); // RECURSION. PUSH ON TO THE STACK
                        if (m = program[count]?.match(/^\)(\d+)$/)) {
                            repCode = m[1]; // MEMO THE REPETITION CODE
                            if (Number(repCode) - 1 <= 0) break;
                            program[count] = `)${Number(repCode) - 1}mark`;
                            count = monitor + 1; // GO AGAIN
                        }
                        else if (m = program[count]?.match(/^\)(\d+)mark$/)) {
                            if (+m[1] - 1 <= 0) {
                                program[count] = `)${repCode}`;
                                break;
                            }
                            program[count] = `)${Number(m[1]) - 1}mark`;
                            count = monitor + 1; // GO AGAIN

                        }
                    }
                    monitor = count; // CONTINUE THE NORMAL ITERATION
                }
            }
        }
        return monitor;
    }
    execute() {
        this.del();
        this.evaluate(0);
        return this.path.map(elem => elem.join``).join`\r\n`;
    }
    parse(program) {
        program = program.replace(/\/\/.*|\/\*[^(\*\/)]*\*\//g, ' ');
        if (/\s+\d+|[PpFRL\)]0+\d+|[^\dFRLPpq\)\(\s\r]|^\d|(\(|q)\d/.test(program)) throw new Error(``);
        program = program.replace(/\s+/g, '');
        let pattern = /[LFRPqp\(\)]\d*|/g;
        program = program.match(pattern);
    }
}
const execute = code => {
    const rs = new RS3(code);
    rs.parse(code);
    return rs.execute();
};
print(execute(program));
