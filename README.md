# Project concept

- Various sources of news flow into my Readwise Reader app. Each of them ends up as a `Document` in the "feed" `DocumentLocation`.
- One source I particularly enjoy is the TLDR newsletter, which shows up with a `DocumentCategory` of "email".
- The TLDR `Document` described above always has a list of article titles, URLs, and summaries in it. When I save one of the articles in it back to Reader, that article is created anew as a `Document` in the "new" `DocumentLocation`.
- The purpose of this project is to generate an AI prompt that enumerates all TLDR articles from my feed worth considering, along with information about the articles I've read and enjoyed from the past few weeks, and that as a result is able to recommend which news articles should be saved for future reading.
