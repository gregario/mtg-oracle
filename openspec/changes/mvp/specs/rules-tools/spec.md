## ADDED Requirements

### Requirement: lookup_rule tool
The system SHALL provide a `lookup_rule` MCP tool that searches the comprehensive rules by section number, keyword, or topic. Returns rule text with section references.

#### Scenario: Lookup by section number
- **WHEN** `lookup_rule` is called with `query: "702.9"`
- **THEN** the system SHALL return the full text of rule section 702.9 and its subsections

#### Scenario: Lookup by keyword
- **WHEN** `lookup_rule` is called with `query: "trample"`
- **THEN** the system SHALL search rules text for "trample" and return matching sections with their section numbers

#### Scenario: Lookup by topic
- **WHEN** `lookup_rule` is called with `query: "combat damage"`
- **THEN** the system SHALL search rules text for the phrase and return relevant sections

#### Scenario: No matching rules
- **WHEN** `lookup_rule` is called with a query that matches no rules
- **THEN** the system SHALL return a message indicating no rules matched and suggest alternative search terms

#### Scenario: Hierarchical context
- **WHEN** a rule subsection is returned (e.g., "702.9b")
- **THEN** the system SHALL include the parent section (e.g., "702.9") for context

### Requirement: get_glossary tool
The system SHALL provide a `get_glossary` MCP tool that looks up MTG glossary term definitions from the comprehensive rules.

#### Scenario: Exact term lookup
- **WHEN** `get_glossary` is called with `term: "Permanent"`
- **THEN** the system SHALL return the glossary definition for "Permanent"

#### Scenario: Case-insensitive lookup
- **WHEN** `get_glossary` is called with `term: "permanent"`
- **THEN** the system SHALL match case-insensitively and return the definition

#### Scenario: Partial term search
- **WHEN** `get_glossary` is called with `term: "mana"` and multiple glossary terms contain "mana"
- **THEN** the system SHALL return all matching glossary entries (e.g., "Mana", "Mana Ability", "Mana Cost", "Mana Pool", "Mana Value")

#### Scenario: Term not found
- **WHEN** `get_glossary` is called with a term that does not exist in the glossary
- **THEN** the system SHALL return an error with a message suggesting the user check spelling or try a related term

### Requirement: get_keyword tool
The system SHALL provide a `get_keyword` MCP tool that returns the full rules definition of a keyword ability (CR section 702) or keyword action (CR section 701).

#### Scenario: Keyword ability lookup
- **WHEN** `get_keyword` is called with `keyword: "Flying"`
- **THEN** the system SHALL return the full rules text for Flying from section 702, including all subsections (702.9a, 702.9b, etc.)

#### Scenario: Keyword action lookup
- **WHEN** `get_keyword` is called with `keyword: "Destroy"`
- **THEN** the system SHALL return the full rules text for the Destroy keyword action from section 701

#### Scenario: Case-insensitive lookup
- **WHEN** `get_keyword` is called with `keyword: "flying"`
- **THEN** the system SHALL match case-insensitively and return the keyword definition

#### Scenario: Keyword not found
- **WHEN** `get_keyword` is called with a word that is not a defined keyword
- **THEN** the system SHALL return an error listing similar known keywords

#### Scenario: Keyword type indication
- **WHEN** a keyword is returned
- **THEN** the response SHALL indicate whether it is a keyword ability (702) or keyword action (701)
