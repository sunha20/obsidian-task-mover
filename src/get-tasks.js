class TaskParser {
    // Support all unordered list bullet symbols as per spec (https://daringfireball.net/projects/markdown/syntax#list)
    bulletSymbols = ["-", "*", "+"];

    // List of strings that include the Markdown content
    #lines;

    // Boolean that encodes whether nested items should be rolled over
    #withChildren;

    constructor(lines, withChildren) {
        this.#lines = lines;
        this.#withChildren = withChildren;
    }

    // Returns true if string s is a task-item
    #isTask(s, status) {
        const r = new RegExp(`\\s*[${this.bulletSymbols.join("")}] \\[${status}\\].*`, "g"); //default: /\s*[-*+] \[[^xX-]\].*/g;
        return r.test(s);
    }

    // Returns true if line after line-number `l` is a nested item
    #hasChildren(l) {
        if (l + 1 >= this.#lines.length) {
            return false;
        }
        const indCurr = this.#getIndentation(l);
        const indNext = this.#getIndentation(l + 1);
        if (indNext > indCurr) {
            return true;
        }
        return false;
    }

    // Returns a list of strings that are the nested items after line `parentLinum`
    #getChildren(parentLinum) {
        const children = [];
        let nextLinum = parentLinum + 1;
        while (this.#isChildOf(parentLinum, nextLinum)) {
            children.push(this.#lines[nextLinum]);
            nextLinum++;
        }
        return children;
    }

    // Returns true if line `linum` has more indentation than line `parentLinum`
    #isChildOf(parentLinum, linum) {
        if (parentLinum >= this.#lines.length || linum >= this.#lines.length) {
            return false;
        }
        return this.#getIndentation(linum) > this.#getIndentation(parentLinum);
    }

    // Returns the number of whitespace-characters at beginning of string at line `l`
    #getIndentation(l) {
        return this.#lines[l].search(/\S/);
    }

    // Returns a list of strings that represents all the tasks along with there potential children
    getTasks(status = "[^xX-]") {
        let tasks = [];
        for (let l = 0; l < this.#lines.length; l++) {
            const line = this.#lines[l];
            if (this.#isTask(line, status)) {
                tasks.push(line);
                if (this.#withChildren && this.#hasChildren(l)) {
                    const cs = this.#getChildren(l);
                    tasks = [...tasks, ...cs];
                    l += cs.length;
                }
            }
        }
        return tasks;
    }
}

// Utility-function that acts as a thin wrapper around `TaskParser`
export const getTasks = ({ lines, withChildren = false, status = "[^xX-]" }) => {
    const taskParser = new TaskParser(lines, withChildren);
    return taskParser.getTasks(status);
}