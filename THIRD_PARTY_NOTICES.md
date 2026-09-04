# Third-party notices

## Pake website-app builder

The manual cloud website-app builder in `.github/workflows/pake-build.yml` uses a curated vendored source import in `third_party/pake` from [tw93/Pake](https://github.com/tw93/Pake), upstream commit `777dd55`.

- **License:** GPL-3.0-or-later
- **Additional output exception:** `third_party/pake/LICENSE-EXCEPTION`
- **Upstream copyright:** Tw93 and Pake contributors

The Pake source, its license, output exception, and upstream notice are retained in `third_party/pake`. Webtoapp-specific modifications are documented in `third_party/pake/UPSTREAM.md` and remain under Pake’s GPL-3.0-or-later terms. The Pake output exception allows generated applications to be distributed under the builder’s chosen terms.
