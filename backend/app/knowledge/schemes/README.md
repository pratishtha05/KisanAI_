# Scheme dataset

One JSON file per scheme. The file name must equal the scheme `id` (e.g. `pm-kisan.json`).
The dataset is validated when the server starts, and any time you run:

    cd backend
    python -m app.modules.schemes.validate

A typo in a rule field, an unknown operator, a missing source URL, etc. fails loudly instead of
silently giving a farmer wrong eligibility advice.

## Rules of the road

* **Every figure needs a source.** Put the official page or a PIB/gov document in `sources`. If you cannot
  confirm a number (an amount that changes yearly, a state rate), do not guess: describe the mechanism and
  tell the farmer to confirm it with the office (see `haryana-bby.json`).
* **Set `last_verified`** to the date you checked. `validate` warns about entries older than 120 days.
* **Scheme closed or paused?** Set `"status": "limited"` (still shown, ranked down, banner shown) or
  `"closed"` (never recommended) and explain in `status_note`. See `pm-kusum.json`.
* **State schemes**: `"level": "state"` and `"states": ["Haryana"]` (use the state names as in the app's
  profile). They are hidden from farmers in other states automatically.

## Eligibility rules

Each rule has a `check` and a `kind`:

| kind | meaning |
|---|---|
| `eligibility` | decides the verdict. If it definitely fails, the farmer is "not eligible" |
| `prerequisite` | a to-do (Aadhaar, bank account, Farmer ID). Never changes the verdict |

A check is `{"field": ..., "op": ..., "value": ...}`, or `{"any": [checks]}` / `{"all": [checks]}`.

Operators: `eq ne in not_in gt gte lt lte between contains_any contains_all is_true is_false`.

Fields (see `KNOWN_FIELDS` in `facts.py`): `state district crops crop_stages crop_types has_farm
land_acres_total land_hectares_total land_class age gender social_category land_ownership
land_owned_before_feb_2019 income_tax_payer govt_employee_or_pensioner constitutional_post_holder
registered_professional covered_by_nps_epfo_esic has_aadhaar has_bank_account aadhaar_linked_bank has_kcc
has_farmer_id irrigation_source pump_type member_group`.

**Unknown is not "no".** If the farmer has not provided a fact, the rule is *unknown* (never failed). Set
`ask` to the question key that would resolve it (or `"farm"` / `"profile"`), and write `unknown_text`.

To add a new fact, add it to `facts.py` (`build_facts` + `KNOWN_FIELDS`), and, if the farmer should be asked,
add the question to `questions.py` and the field to `SchemeAnswers` in `profile_store.py`.

## Other fields

* `benefit_tiers`: `[{"when": check, "text": "..."}]`. Shown when the check is definitely true
  (e.g. "you qualify for the 55% subsidy").
* `relevance.base_priority` (0-100): how broadly valuable the scheme is. `relevance.adjust` adds or removes
  points for a specific situation, with a `reason` shown to the farmer.
* `deadline.type`: `rolling` (always open), `periodic` (paid in cycles), `info` (dates set locally),
  `fixed` (`closes: "YYYY-MM-DD"`), `seasonal` (`windows` with `opens`/`closes` as `MM-DD`; countdowns are
  computed from today's date and the seasons the farmer's crops are grown in). Mark `approximate: true`
  when states set their own cut-offs.

See `_template.json.example` for a starting point (copy to `<id>.json`).
