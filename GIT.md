# Useful Git Commands

This document lists some essential Git commands for version control.

## Initialization
- `git init`: Initialize a new Git repository in the current directory.

## Cloning
- `git clone <repository-url>`: Clone a repository from a remote URL.

## Staging and Committing
- `git add <file>`: Stage a specific file for commit.
- `git add .`: Stage all changes in the current directory.
- `git commit -m "Commit message"`: Commit staged changes with a message.
- `git commit --amend`: Amend the last commit (useful for fixing commit messages).

## Status and History
- `git status`: Show the status of the working directory and staging area.
- `git log`: Display commit history.
- `git log --oneline`: Show a concise commit history.
- `git diff`: Show differences between working directory and staging area.
- `git diff --staged`: Show differences between staging area and last commit.

## Branching
- `git branch`: List all branches.
- `git branch <branch-name>`: Create a new branch.
- `git checkout <branch-name>`: Switch to a branch.
- `git checkout -b <branch-name>`: Create and switch to a new branch.
- `git merge <branch-name>`: Merge a branch into the current branch.
- `git rebase <branch-name>`: Rebase the current branch onto another branch.

## Remote Repositories
- `git remote -v`: List remote repositories.
- `git remote add origin <url>`: Add a remote repository.
- `git push origin <branch>`: Push commits to a remote branch.
- `git pull origin <branch>`: Pull changes from a remote branch.
- `git fetch origin`: Fetch changes from remote without merging.

## Undoing Changes
- `git reset <file>`: Unstage a file.
- `git reset --hard HEAD`: Reset working directory to last commit (destructive).
- `git revert <commit-hash>`: Create a new commit that undoes changes from a previous commit.

## Stashing
- `git stash`: Temporarily save changes without committing.
- `git stash pop`: Apply stashed changes and remove from stash.

## Tagging
- `git tag <tag-name>`: Create a lightweight tag.
- `git tag -a <tag-name> -m "Message"`: Create an annotated tag.

## Collaboration
- `git pull --rebase origin <branch>`: Pull and rebase to avoid merge commits.
- `git cherry-pick <commit-hash>`: Apply changes from a specific commit.

Remember to always check `git status` before committing to ensure you're committing the right changes.
