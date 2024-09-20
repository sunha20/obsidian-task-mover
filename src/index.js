import {Notice, Plugin, W} from "obsidian";
import {
    getDailyNoteSettings,
    getAllDailyNotes,
    getDailyNote,
} from "obsidian-daily-notes-interface";
import UndoModal from "./ui/UndoModal";
import TaskMoverSettingTab from "./ui/TaskMoverSettingTab";
import {getTasks} from "./get-tasks";

const MAX_TIME_SINCE_CREATION = 5000; // 5 seconds

export default class TaskMover extends Plugin {
    async loadSettings() {
        const DEFAULT_SETTINGS = {
            templateHeading: "",
            customStatus: "[^xX-]",
            groupByPath: false,
            groupHeadingLevel: 3,
            deleteOnComplete: false,
            removeEmptyTasks: false,
            rolloverChildren: false,
            rolloverOnFileCreate: true,
        };
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    isDailyNotesEnabled() {
        const dailyNotesPlugin = this.app.internalPlugins.plugins["daily-notes"];
        const dailyNotesEnabled = dailyNotesPlugin && dailyNotesPlugin.enabled;

        const periodicNotesPlugin = this.app.plugins.getPlugin("periodic-notes");
        const periodicNotesEnabled =
            periodicNotesPlugin && periodicNotesPlugin.settings?.daily?.enabled;

        return dailyNotesEnabled || periodicNotesEnabled;
    }

    getSortedDailyNotes() {
        const {moment} = window;
        let {folder, format} = getDailyNoteSettings();

        folder = this.getCleanFolder(folder);
        folder = folder.length === 0 ? folder : folder + "/";

        const dailyNoteRegexMatch = new RegExp("^" + folder + "(.*).md$");
        const todayMoment = moment();

        // get all notes in directory that aren't null
        const dailyNoteFiles = this.app.vault
            .getMarkdownFiles()
            .filter((file) => file.path.startsWith(folder))
            .filter((file) =>
                moment(
                    file.path.replace(dailyNoteRegexMatch, "$1"),
                    format,
                    true
                ).isValid()
            )
            .filter((file) => file.basename)
            .filter((file) =>
                this.getFileMoment(file, folder, format).isSameOrBefore(
                    todayMoment,
                    "day"
                )
            );

        // sort by date
        const sorted = dailyNoteFiles.sort(
            (a, b) =>
                this.getFileMoment(b, folder, format).valueOf() -
                this.getFileMoment(a, folder, format).valueOf()
        );

        return sorted;
    }

    getLastDailyNote() {
        return this.getSortedDailyNotes()[1];
    }

    getLastWeekNote() {
        const dailyNotesList = this.getSortedDailyNotes();
        const lastWeekNoteList = dailyNotesList.length > 15 ? dailyNotesList.slice(0, 15) : dailyNotesList;
        const today = new Date();

        // 현재 요일 (0 = 일요일, 6 = 토요일)
        const currentDay = today.getDay();

        // 저번 주 토요일: 오늘 날짜에서 요일을 빼고 1주일을 추가로 뺌
        const lastSaturday = new Date(today);
        lastSaturday.setDate(today.getDate() - currentDay - 1);

        // 저번 주 일요일: 저번 주 토요일에서 6일을 뺌
        const lastSunday = new Date(lastSaturday);
        lastSunday.setDate(lastSaturday.getDate() - 6);

        // 주어진 날짜들을 필터링 (string 배열을 Date로 변환해서 범위에 있는지 체크)
        return lastWeekNoteList.filter(note => {
            const date = new Date(note.basename);
            return date >= lastSunday && date <= lastSaturday;
        });
    }

    getFileMoment(file, folder, format) {
        let path = file.path;

        if (path.startsWith(folder)) {
            // Remove length of folder from start of path
            path = path.substring(folder.length);
        }

        if (path.endsWith(`.${file.extension}`)) {
            // Remove length of file extension from end of path
            path = path.substring(0, path.length - file.extension.length - 1);
        }

        return moment(path, format);
    }

    async getAllTasks(file, status = "[^xX-]") {
        const dn = await this.app.vault.read(file);
        const dnLines = dn.split(/\r?\n|\r|\n/g);

        return getTasks({
            lines: dnLines,
            withChildren: this.settings.rolloverChildren,
            status: status,  // status를 전달
        });
    }

    async sortHeadersIntoHierarchy(file) {
        ///console.log('testing')
        const templateContents = await this.app.vault.read(file);
        const allHeadings = Array.from(templateContents.matchAll(/#{1,} .*/g)).map(
            ([heading]) => heading
        );

        if (allHeadings.length > 0) {
            console.log(createRepresentationFromHeadings(allHeadings));
        }
    }

    getCleanFolder(folder) {
        // Check if user defined folder with root `/` e.g. `/dailies`
        if (folder.startsWith("/")) {
            folder = folder.substring(1);
        }

        // Check if user defined folder with trailing `/` e.g. `dailies/`
        if (folder.endsWith("/")) {
            folder = folder.substring(0, folder.length - 1);
        }

        return folder;
    }

    // checkVaildDailyNote(file = undefined) {
    //     let {folder, format} = getDailyNoteSettings();
    //     let ignoreCreationTime = false;
    //
    //     // Rollover can be called, but we need to get the daily file
    //     if (file == undefined) {
    //         const allDailyNotes = getAllDailyNotes();
    //         file = getDailyNote(window.moment(), allDailyNotes);
    //         ignoreCreationTime = true;
    //     }
    //     if (!file) return false;
    //
    //     folder = this.getCleanFolder(folder);
    //
    //     // is a daily note
    //     if (!file.path.startsWith(folder)) return false;
    //
    //     // is today's daily note
    //     const today = new Date();
    //     const todayFormatted = window.moment(today).format(format);
    //     const filePathConstructed = `${folder}${
    //         folder == "" ? "" : "/"
    //     }${todayFormatted}.${file.extension}`;
    //     if (filePathConstructed !== file.path) return false;
    //
    //     // was just created
    //     if (
    //         today.getTime() - file.stat.ctime > MAX_TIME_SINCE_CREATION &&
    //         !ignoreCreationTime
    //     )
    //         return false;
    //
    //     return true;
    // }

    summorizeRollover(tasksAdded, numEmpiesToNotAdd, deleteOnComplete, templateHeadingNotFoundMessage, undoHistoryInstance) {
        const tasksAddedString =
            tasksAdded == 0
                ? ""
                : `- ${tasksAdded} task${tasksAdded > 1 ? "s" : ""} rolled over.`;
        const emptiesToNotAddToTomorrowString =
            emptiesToNotAddToTomorrow == 0
                ? ""
                : deleteOnComplete
                    ? `- ${emptiesToNotAddToTomorrow} empty task${
                        emptiesToNotAddToTomorrow > 1 ? "s" : ""
                    } removed.`
                    : "";
        const part1 =
            templateHeadingNotFoundMessage.length > 0
                ? `${templateHeadingNotFoundMessage}`
                : "";
        const part2 = `${tasksAddedString}${
            tasksAddedString.length > 0 ? " " : ""
        }`;
        const part3 = `${emptiesToNotAddToTomorrowString}${
            emptiesToNotAddToTomorrowString.length > 0 ? " " : ""
        }`;

        let allParts = [part1, part2, part3];
        let nonBlankLines = [];
        allParts.forEach((part) => {
            if (part.length > 0) {
                nonBlankLines.push(part);
            }
        });

        const message = nonBlankLines.join("\n");
        if (message.length > 0) {
            new Notice(message, 4000 + message.length * 3);
        }
        this.undoHistoryTime = new Date();
        this.undoHistory = [undoHistoryInstance];
    }

    async editLast(note, previousDayHistory, tasks) {
        let lastNoteContent = await this.app.vault.read(note);

        previousDayHistory.push({
            file: note,
            oldContent: `${tasks}`,
        });
        let lines = lastNoteContent.split("\n");


        for (let i = lines.length - 1; i >= 0; i--) {
            if (tasks.includes(lines[i])) {
                lines.splice(i, 1);
            }
        }

        const modifiedContent = lines.join("\n");
        await this.app.vault.modify(note, modifiedContent);
    }

    async editToday(templateHeading, tasks, file, undoHistoryInstance) {
        let templateHeadingNotFoundMessage = "";
        const templateHeadingSelected = templateHeading !== "none";

        if (tasks.length > 0) {
            let dailyNoteContent = await this.app.vault.read(file);
            undoHistoryInstance.today = {
                file: file,
                oldContent: `${dailyNoteContent}`,
            };
            const tasks_todayString = `\n${tasks.join("\n")}`;

            // If template heading is selected, try to rollover to template heading
            if (templateHeadingSelected) {
                const contentAddedToHeading = dailyNoteContent.replace(
                    templateHeading,
                    `${templateHeading}${tasks_todayString}`
                );
                if (contentAddedToHeading === dailyNoteContent) {
                    templateHeadingNotFoundMessage = `Rollover couldn't find '${templateHeading}' in today's daily not. Rolling tasks to end of file.`;
                } else {
                    dailyNoteContent = contentAddedToHeading;
                }
            }

            // Rollover to bottom of file if no heading found in file, or no heading selected
            if (
                !templateHeadingSelected ||
                templateHeadingNotFoundMessage.length > 0
            ) {
                dailyNoteContent += tasks_todayString;
            }

            await this.app.vault.modify(file, dailyNoteContent);
        }
        return templateHeadingNotFoundMessage;
    }

    filterTask(tasks) {
        let numOfEmpty = 0;
        let filteredTasks = [];
        tasks.forEach((line) => {
            const trimmedLine = (line || "").trim();
            if (trimmedLine != "- [ ]" && trimmedLine != "- [  ]")
                filteredTasks.push(line);
            else
                numOfEmpty++;
        });
        return {numOfEmpty, filteredTasks};
    }

    async rollover(source, file) {
        /*** First we check if the file created is actually a valid daily note ***/
        if (file === null) {
            return;
        }

        /*** Next, if it is a valid daily note, but we don't have daily notes enabled, we must alert the user ***/
        if (!this.isDailyNotesEnabled()) {
            new Notice(
                "Task Mover unable to rollover unfinished tasks: Please enable Daily Notes, or Periodic Notes (with daily notes enabled).",
                10000
            );
            return;
        }

        const {templateHeading, customStatus, groupByPath, groupHeadingLevel, deleteOnComplete, removeEmptyTasks,} =
            this.settings;


        // check if there is a daily note from yesterday
        let lastNotes = []
        if (source === "day") {
            lastNotes = [this.getLastDailyNote()];
        } else if (source === "week") {
            lastNotes = this.getLastWeekNote();
            if (!lastNotes || !lastNotes.length === 0) {
                new Notice("no week list", 30000);
                return;
            }
        }

        // setup undo history
        let undoHistoryInstance = {
            previousDay: [{
                file: undefined,
                oldContent: "",
            },],
            today: {
                file: undefined,
                oldContent: "",
            },
        };

        // get tasks from noteList, if exist
        let taskList = []
        let numEmptesToNotAdd = 0;
        for (let note of lastNotes) {
            let tasks = await this.getAllTasks(note, customStatus);

            console.log(
                `rollover-daily-tasks: ${tasks.length} tasks found in ${note.basename}.md`
            );

            if (tasks.length === 0)
                continue;


            // filter empty tasks
            if (removeEmptyTasks) {
                const {numOfEmpty, filteredTasks} = this.filterTask(tasks);
                numEmptesToNotAdd += numOfEmpty;

                if (!filteredTasks || filteredTasks.length === 0)
                    continue;
                else
                    tasks = filteredTasks;
            }


            // if deleteOnComplete, get yesterday's content and modify it
            if (deleteOnComplete) {
                await this.editLast(note, undoHistoryInstance.previousDay, tasks);
            }


            // group by path
            if (groupByPath) {
                taskList.push("#".repeat(groupHeadingLevel) + " " + note.basename);
            }

            taskList = taskList.concat(tasks);
        }

        // get today's content and modify it
        const numTask = taskList.length;
        const templateHeadingNotFoundMessage = await this.editToday(templateHeading, taskList, file, undoHistoryInstance);

        // summary
        this.summorizeRollover(numTask, numEmpiesToNotAdd, deleteOnComplete, templateHeadingNotFoundMessage, undoHistoryInstance);

    }

    async onload() {
        await this.loadSettings();
        this.undoHistory = [];
        this.undoHistoryTime = new Date();

        this.addSettingTab(new TaskMoverSettingTab(this.app, this));

        this.registerEvent(
            this.app.vault.on("create", async (file) => {
                // Check if automatic daily note creation is enabled
                if (!this.settings.rolloverOnFileCreate) return;
                this.rollover(file);
            })
        );

        this.addCommand({
            id: "obsidian-rollover-last-day-tasks",
            name: "Rollover Last Day Tasks",
            callback: () => {
                this.rollover("day", this.app.workspace.getActiveFile());
            },
        });

        this.addCommand({
            id: "obsidian-rollover-tasks-undo",
            name: "Undo last rollover",
            checkCallback: (checking) => {
                // no history, don't allow undo
                if (this.undoHistory.length > 0) {
                    const now = window.moment();
                    const lastUse = window.moment(this.undoHistoryTime);
                    const diff = now.diff(lastUse, "seconds");
                    // 2+ mins since use: don't allow undo
                    if (diff > 2 * 60) {
                        return false;
                    }
                    if (!checking) {
                        new UndoModal(this).open();
                    }
                    return true;
                }
                return false;
            },
        });

        this.addCommand({
            id: "obsidian-rollover-last-week-tasks",
            name: "Rollover Last Week Tasks",
            callback: () => {
                this.rollover("week", this.app.workspace.getActiveFile());
            }
        });

    }
}
