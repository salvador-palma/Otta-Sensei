import requests


def GetWord(query: str, max_results: int = 5):
    url = f"https://jisho.org/api/v1/search/words?keyword={query}"

    try:
        res = requests.get(url)
        res.raise_for_status()
        data = res.json()
    except requests.RequestException as e:
        print(f"Error calling Jisho API: {e}")
        return

    results = data.get("data", [])
    if not results:
        print(f"No results found for '{query}'.")
        return None
    return results

    # for i, entry in enumerate(results[:max_results], 1):
    #     japanese = entry.get("japanese", [{}])[0]
    #     senses = entry.get("senses", [])
    #
    #     word = japanese.get("word", "(no kanji form)")
    #     reading = japanese.get("reading", "(no reading)")
    #
    #     print(f"\n[{i}] {word} — {reading}")
    #     print("Meanings:")
    #     for s in senses:
    #         english = "; ".join(s.get("english_definitions", []))
    #         pos = ", ".join(s.get("parts_of_speech", []))
    #         print(f" - {english} ({pos})")


GetWord("語")