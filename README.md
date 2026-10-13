# Tab Organizer for ExpressionEngine 7

Visually organize publish layout fields into rows, right on the channel layout edit screen. Drag to reorder, drag the edge to resize, and add named dividers to break up long tabs.

## Features

- **Reorganize mode** on the layout edit screen: every tab becomes a canvas where fields sit at their real width, so what you see is what the entry form will look like
- **Drag and drop** to reorder fields; fields that fit share a line
- **Resize** by dragging a field's right edge (or focus it and use the arrow keys). Snaps to 25 / 33 / 50 / 66 / 75 / 100%, the same widths EE's own width dropdown offers
- **Dividers**: add a full-width divider with an optional name, shown on the entry form as a labelled line
- **Save organizing** saves through EE's normal layout save. **Cancel reorganize** throws away everything you changed in the session
- The regular layout list also shows fields at their saved widths, and draws dividers

## Requirements

- ExpressionEngine 7
- PHP 8.1+

## Installation

1. Copy `system/user/addons/reizoko_tab_organizer` to your site's `system/user/addons/` directory
2. In the control panel, go to **Add-ons** and install **Tab Organizer**

There are no settings and no database tables.

## Usage

1. In the control panel, open a channel's **Layouts** and edit a layout (`…/cp/channels/layouts/edit/{id}`)
2. Click **Enable reorganize** (bottom of the page, next to Save)
3. Drag fields, resize them, click **Add divider** and type a name if you want one
4. Click **Save organizing**, or **Cancel reorganize** to discard

While reorganize mode is on, EE's own Save buttons are disabled so you can't save a half-finished state by accident.

## How it works

- Field widths use EE's existing per-field `width` value in the layout, so nothing new is stored for them
- Dividers are stored in the layout itself, per tab, as `rtb_dividers`: a list of `{before: <field id>, label}`. Each divider is anchored above a field. If that field is later removed from the layout, the divider moves to the end of its tab
- The add-on is an extension on the `cp_js_end` and `cp_css_end` hooks. The entry form fetches divider data for its layout from the same `cp_js_end` endpoint

## Notes

- Dividers are display-only. They hold no value and are not available in templates
- Dragging a field to a different tab still uses EE's regular layout list; reorganize mode works within a tab
- Back up (or export) your layouts before applying changes to a production site

## License

[MIT](LICENSE)
