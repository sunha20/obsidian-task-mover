import {Setting, PluginSettingTab} from "obsidian";
import {getDailyNoteSettings} from "obsidian-daily-notes-interface";

export default class TaskMoverSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    async display() {
        this.containerEl.empty();

        new Setting(this.containerEl)
            .setName("Rollover Heading")
            .setDesc("Which heading should the tasks go under. If the current note doesn't have a corresponding title, tasks are added to the bottom of the note. Please write it in the following format \"### Uncompleted task\".")
            .addText(text => text
                .setValue(this.plugin?.settings.templateHeading)
                .onChange((value) => {
                    this.plugin.settings.templateHeading = value;
                    this.plugin.saveSettings();
                })
            );

        new Setting(this.containerEl)
            .setName("Custom Status")
            .setDesc("Set the status of the task to which you want to apply the rollover. Please write it in regular expression format.(default: [^xX-])")
            .addText(text => text
                .setValue(this.plugin.settings.customStatus)
                .onChange(async (value) => {
                    this.plugin.settings.customStatus = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(this.containerEl)
            .setName("Grouping Tasks")
            .setDesc("Grouping tasks by which note they were rolled over from.")
            .addToggle((toggle) => toggle
                .setValue(this.plugin.settings.groupByPath || false)
                .onChange(async (value) => {
                    this.plugin.settings.groupByPath = value;
                    await this.plugin.saveSettings();
                    this.hide();
                    this.display();
                })
            );

        if (this.plugin.settings.groupByPath) {
            new Setting(this.containerEl)
                .setName("Grouping heading level")
                .addDropdown((dropdown) => dropdown
                    .addOption(1, "1")
                    .addOption(2, "2")
                    .addOption(3, "3")
                    .addOption(4, "4")
                    .addOption(5, "5")
                    .addOption(6, "6")
                    .setValue(this.plugin.settings.groupHeadingLevel)
                    .onChange((value) => {
                        this.plugin.settings.groupHeadingLevel = value;
                        this.plugin.saveSettings();
                    })
                );
            
        }

        new Setting(this.containerEl)
            .setName("Delete tasks from previous day")
            .setDesc(
                `Once tasks are found, they are added to Today's Daily Note. If successful, they are deleted from Yesterday's Daily note. Enabling this is destructive and may result in lost data. Keeping this disabled will simply duplicate them from yesterday's note and place them in the appropriate section. Note that currently, duplicate tasks will be deleted regardless of what heading they are in, and which heading you choose from above.`
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.deleteOnComplete || false)
                    .onChange((value) => {
                        this.plugin.settings.deleteOnComplete = value;
                        this.plugin.saveSettings();
                    })
            );

        new Setting(this.containerEl)
            .setName("Remove empty tasks")
            .setDesc(
                `If you have empty tasks, they will not be rolled over to the next day.`
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.removeEmptyTasks || false)
                    .onChange((value) => {
                        this.plugin.settings.removeEmptyTasks = value;
                        this.plugin.saveSettings();
                    })
            );

        new Setting(this.containerEl)
            .setName("Roll over children of tasks")
            .setDesc(
                `By default, only the actual tasks are rolled over. If you add nested Markdown-elements beneath your tasks, these are not rolled over but stay in place, possibly altering the logic of your previous note. This setting allows for also migrating the nested elements.`
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.rolloverChildren || false)
                    .onChange((value) => {
                        this.plugin.settings.rolloverChildren = value;
                        this.plugin.saveSettings();
                    })
            );

    }
}
