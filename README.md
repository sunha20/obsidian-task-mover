# Obsidian Task Mover

The first thing to mention is that it's heavily inspired from the [obsidian-rollover-daily-todos](https://github.com/lumoe/obsidian-rollover-daily-todos)

“Obsidian task mover” is a plugin that rollovers an uncompeleted (or other) task into the current file.

## Usage
### 1. Commands
- Rollover Last Day Tasks: Rollover tasks from the most recent daily notes.
- Rollover Last Week Tasks: Rollover tasks from daily notes between Sunday and Saturday of the previous week as of the current date.
- Undo last rollover: Undo last rollover which can be run within 2 minutes of a rollover occurring. Currently only 1 undo is available for use at the moment.

### 2. Options
- Rollover Heading: Which heading should the tasks go under. If the current note doesn't have a corresponding title, tasks are added to the bottom of the note.
- Custom Status: Set the status of the task to which you want to apply the rollover.
- Grouping Tasks: Grouping tasks based on which note they were rolled over from. You can also specify a group heading level.
- Delete tasks from previous day: When the task is rolled over, the original note task is deleted.
- Remove empty tasks: Empty tasks are not rolled over.
- Rollover children of tasks: All nested subtasks are rolled over.

## Requirements
You must have either:
- Daily notes plugin installed or
- Periodic Notes plugin installed AND the Daily Notes setting toggled on
