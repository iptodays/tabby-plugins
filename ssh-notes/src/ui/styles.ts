export const SSH_NOTES_STYLES = `
:host {
    display: block;
    color: var(--theme-fg);
    height: 100%;
}

.ssh-notes-page {
    display: flex;
    flex-direction: column;
    gap: .75rem;
    padding: 1rem;
    height: 100%;
    overflow: auto;
    box-sizing: border-box;
}

.ssh-notes-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: .5rem;
}

.ssh-notes-toolbar .form-control,
.ssh-notes-toolbar .form-select {
    min-width: 8rem;
    width: auto;
}

.ssh-notes-toolbar .search {
    flex: 1 1 14rem;
    min-width: 12rem;
}

.ssh-notes-layout {
    display: grid;
    grid-template-columns: minmax(18rem, 38%) minmax(0, 1fr);
    gap: .75rem;
    min-height: 0;
    flex: 1;
}

.ssh-notes-list {
    display: flex;
    flex-direction: column;
    gap: .35rem;
    min-height: 0;
    overflow: auto;
    padding-right: .2rem;
}

.ssh-note-row {
    display: flex;
    align-items: flex-start;
    gap: .55rem;
    width: 100%;
    padding: .55rem .65rem;
    border: 1px solid var(--theme-bg-more-2);
    border-radius: .4rem;
    background: transparent;
    color: inherit;
    text-align: left;
    cursor: pointer;
}

.ssh-note-row:hover {
    background: var(--theme-bg-more);
}

.ssh-note-row.active {
    background: var(--theme-secondary);
    border-color: var(--theme-primary);
}

.ssh-note-color {
    flex: 0 0 auto;
    width: .6rem;
    height: .6rem;
    border-radius: 50%;
    margin-top: .35rem;
    background: var(--theme-fg-more-2);
}

.ssh-note-row-main {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: .12rem;
}

.ssh-note-row-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
}

.ssh-note-row-sub {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: .82rem;
    color: var(--theme-fg-more-2);
}

.ssh-note-row-side {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: .2rem;
}

.ssh-note-detail {
    border: 1px solid var(--theme-bg-more-2);
    border-radius: .5rem;
    background: var(--theme-bg-more);
    padding: .9rem;
    min-width: 0;
    overflow: auto;
}

.ssh-note-detail-head {
    display: flex;
    align-items: flex-start;
    gap: .75rem;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--theme-bg-more-2);
    padding-bottom: .65rem;
    margin-bottom: .75rem;
}

.ssh-note-detail-head h3 {
    margin: 0;
    font-size: 1.15rem;
}

.ssh-note-detail-actions {
    display: flex;
    flex-wrap: wrap;
    gap: .4rem;
    margin-left: auto;
}

.ssh-note-title {
    font-size: 1.3rem;
    font-weight: 600;
    margin: .1rem 0 .35rem;
    overflow-wrap: anywhere;
}

.ssh-note-description {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    line-height: 1.65;
    margin: .5rem 0;
}

.ssh-note-meta {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
    gap: .4rem .8rem;
    margin: .75rem 0;
    font-size: .9rem;
}

.ssh-note-meta-label {
    display: block;
    color: var(--theme-fg-more-2);
    font-size: .78rem;
}

.ssh-note-tags {
    display: flex;
    flex-wrap: wrap;
    gap: .35rem;
    margin: .35rem 0;
}

.ssh-note-tag {
    display: inline-flex;
    align-items: center;
    gap: .25rem;
    border: 1px solid var(--theme-bg-more-2);
    border-radius: 1rem;
    padding: .1rem .55rem;
    font-size: .8rem;
    background: var(--theme-bg-more-2);
    color: var(--theme-fg);
}

button.ssh-note-tag {
    cursor: pointer;
}

button.ssh-note-tag.active {
    border-color: var(--theme-primary);
    color: var(--theme-primary);
}

.ssh-note-env-badge {
    display: inline-flex;
    align-items: center;
    border-radius: 1rem;
    border: 1px solid currentColor;
    padding: 0 .5rem;
    font-size: .78rem;
    line-height: 1.55;
    white-space: nowrap;
}

.ssh-notes-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: .5rem;
    min-height: 10rem;
    padding: 2rem 1rem;
    text-align: center;
    color: var(--theme-fg-more-2);
}

.ssh-notes-empty .fa {
    font-size: 1.8rem;
    opacity: .6;
}

.ssh-notes-banner {
    border: 1px solid var(--theme-warning);
    background: var(--theme-warning-fg);
    color: var(--theme-warning);
    border-radius: .4rem;
    padding: .55rem .7rem;
    font-size: .88rem;
}

.ssh-notes-error {
    border: 1px solid var(--theme-danger);
    background: var(--theme-danger-fg);
    color: var(--theme-danger);
    border-radius: .4rem;
    padding: .55rem .7rem;
    font-size: .88rem;
}

.ssh-notes-form {
    display: flex;
    flex-direction: column;
    gap: .8rem;
}

.ssh-notes-form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
    gap: .7rem;
}

.ssh-notes-form .field label,
.ssh-notes-form .field .field-label {
    display: block;
    font-size: .85rem;
    color: var(--theme-fg-more);
    margin-bottom: .2rem;
}

.ssh-notes-form .field .hint {
    display: block;
    font-size: .78rem;
    color: var(--theme-fg-more-2);
    margin-top: .2rem;
}

.ssh-notes-form .field .invalid {
    color: var(--theme-danger);
}

.ssh-notes-form-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: .5rem;
    border-top: 1px solid var(--theme-bg-more-2);
    padding-top: .75rem;
}

.ssh-notes-form-actions .spacer {
    flex: 1;
}

.ssh-notes-connection {
    border: 1px solid var(--theme-bg-more-2);
    border-radius: .4rem;
    padding: .55rem .7rem;
    background: var(--theme-bg-more);
    font-size: .88rem;
    color: var(--theme-fg-more);
}

.ssh-notes-connection strong {
    color: var(--theme-fg);
}

.ssh-notes-section {
    border: 1px solid var(--theme-bg-more-2);
    border-radius: .5rem;
    padding: .9rem;
    margin-bottom: .8rem;
}

.ssh-notes-section h4 {
    margin: 0 0 .3rem;
    font-size: 1rem;
}

.ssh-notes-section .section-desc {
    color: var(--theme-fg-more-2);
    font-size: .85rem;
    margin-bottom: .6rem;
}

.ssh-notes-data-path {
    font-family: var(--font-monospace);
    font-size: .82rem;
    overflow-wrap: anywhere;
    background: var(--theme-bg-more-2);
    border-radius: .3rem;
    padding: .4rem .5rem;
}

.ssh-notes-import-preview {
    border: 1px solid var(--theme-primary);
    border-radius: .4rem;
    padding: .75rem;
    margin-top: .75rem;
}

.ssh-notes-import-preview ul {
    margin: .4rem 0;
    padding-left: 1.2rem;
    max-height: 10rem;
    overflow: auto;
}

.ssh-notes-settings-tabs {
    display: flex;
    gap: .35rem;
    border-bottom: 1px solid var(--theme-bg-more-2);
    padding-bottom: .4rem;
    margin-bottom: .8rem;
}

@media (max-width: 860px) {
    .ssh-notes-layout {
        grid-template-columns: 1fr;
    }

    .ssh-notes-list {
        max-height: 18rem;
    }
}
`
