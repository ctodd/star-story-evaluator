# Adding Bar Raiser Evaluation to STAR Stories App

This document outlines the implementation of a second layer of scrutiny to the STAR story evaluation application using an "Amazon Bar Raiser" AI role.

## Overview

The Bar Raiser feature provides a more critical, in-depth evaluation of STAR stories from the perspective of an Amazon Bar Raiser. This adds a second layer of scrutiny that focuses on:

1. Leadership Principles depth and breadth
2. Scope and impact of the candidate's actions
3. Decision-making process and judgment
4. Potential red flags or concerns
5. Cross-functional applicability
6. Career growth trajectory indicators

## Implementation Details

### 1. Bar Raiser Prompt Template

Created a new prompt template in `barRaiserPrompt.mjs` that:
- Adopts the persona of an experienced Amazon Bar Raiser
- Provides a structured evaluation format focusing on Bar Raiser concerns
- Includes a clear hiring recommendation (Strong Hire, Inclined, Not Inclined, Strong No Hire)
- Analyzes Leadership Principles at a deeper level
- Identifies red flags and provides follow-up questions

### 2. Server-Side Changes

Modified `server.mjs` to:
- Import the Bar Raiser prompt template
- Add support for an optional Bar Raiser evaluation
- Make a second AI call when Bar Raiser evaluation is requested
- Return both standard and Bar Raiser evaluations in the response

### 3. Frontend Changes

Updated the frontend to:
- Add a checkbox option for including Bar Raiser evaluation
- Display a tabbed interface when both evaluations are available
- Create a distinct visual style for the Bar Raiser evaluation
- Parse and display the Bar Raiser specific feedback
- Add tooltips explaining the Bar Raiser role

### 4. UI/UX Improvements

- Added a tabbed interface to switch between standard and Bar Raiser evaluations
- Created a distinct visual style for Bar Raiser feedback with a different color scheme
- Added progress indicators for the additional Bar Raiser processing steps
- Implemented tooltips to explain the Bar Raiser concept to users

## Usage

Users can now:
1. Enter their STAR story as before
2. Check the "Include Bar Raiser evaluation" checkbox for additional scrutiny
3. Submit the story for evaluation
4. Toggle between the standard evaluation and the Bar Raiser perspective using tabs

## Benefits

This feature provides several benefits:
- More comprehensive feedback from different perspectives
- Higher level of scrutiny similar to actual Amazon interview loops
- Deeper analysis of Leadership Principles demonstration
- Identification of potential red flags that might be missed in standard evaluation
- Follow-up questions that help prepare for actual Bar Raiser interviews

## Technical Implementation

The implementation follows the existing application architecture:
- Separate prompt template for the Bar Raiser role
- Conditional API calls based on user selection
- Parsing logic for the Bar Raiser specific response format
- Tabbed UI for switching between evaluation perspectives
