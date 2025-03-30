# Project concept

- Various sources of news flow into my Readwise Reader app. Each of them ends up as a `Document` in the "feed" `DocumentLocation`.
- One source I particularly enjoy is the TLDR newsletter, which shows up with a `DocumentCategory` of "email".
- The TLDR `Document` described above always has a list of article titles, URLs, and summaries in it. When I save one of the articles in it back to Reader, that article is created anew as a `Document` in the "new" `DocumentLocation`.
- The purpose of this project is to generate an AI prompt that enumerates all TLDR articles from my feed worth considering, along with information about the articles I've read and enjoyed from the past few weeks, and that as a result is able to recommend which news articles should be saved for future reading.

# Implementation details

- **DONE** - Incoming article metadata can be extracted from Reader `Document`. I want to write a method that queries `Document`s where the `DocumentLocation` is "feed", the `DocumentCategory` is "email", and then parses the content for article titles, URLs, and summaries, ultimately returning them as a cohesive array.
- **NOT STARTED** - There is an entire history of `Document`s I have saved and read over 75% of, which indicates I found value in selecting them and subsequently enjoyed them. I want to write a method that queries for these by looking for any `Document` that is in the "archive" `DocumentLocation` and then filtering down the query results to only keep `Document`s where the `reading_progress` is above "0.75" (75%).

---

- **NOT STARTED** - I want to write a method that takes the output of the two methods above, and generates the prompt described in the project concept above. This prompt will be run manually by somebody with access to ChatGPT and it should return a highly structured list of article URLs it suggests I save.
- **NOT STARTED** - I want to be able to copy the list of suggested article URLs back into this program somehow, and have it create one new `Document` per article. Nothing is required except the `url` and also the `saved_using` parameter, which should be set to "AI Recommender".
