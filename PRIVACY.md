# Privacy Policy — Design Tool

**Last updated: September 2026**

Design Tool is a Chrome extension for inspecting the visual styling of web
pages. This policy explains, plainly, what it does and does not do with your
data.

## What Design Tool does

Design Tool reads the computed CSS styles and element geometry of the page you
are actively inspecting, so it can show that information in its on-page card.
This happens entirely inside your browser, on the single tab you activated it
on.

## What Design Tool does not do

- It makes **no network requests**. There is nothing to intercept, because
  nothing is ever sent anywhere.
- It does not collect, log, or transmit anything about the pages you visit,
  their content, or your activity on them.
- No analytics, no telemetry, no tracking, no crash reporting to a third
  party.
- No user accounts, no sign-in, nothing tied to your identity.

## What is stored, and where

The extension saves a small set of your own display preferences using
Chrome's local storage API, entirely on your device:

- Your chosen unit (px, rem, or em)
- Light or dark theme
- The inspector panel's position and size

None of this leaves your browser. It is never transmitted anywhere, and the
developer has no access to it, no way to see it, and no copy of it.

## Permissions

Design Tool requests three permissions: `activeTab`, `scripting`, and
`storage`. It does not request a host permission, so it has no standing
access to any site — only the tab you explicitly activate it on, for that
one visit. See the [README](https://github.com/shadezie/design-tool) for how
each permission is used.

## Open source

The full source is public: https://github.com/shadezie/design-tool. Anything
claimed in this policy can be verified directly in the code.

## Changes to this policy

Any change to this policy will be reflected here with an updated date.

## Contact

Questions: open an issue at https://github.com/shadezie/design-tool/issues
