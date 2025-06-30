import sys
import yake

text = "test test"
language = "en"
max_keywords = 10
ngram_size = 3
deduplication_threshold = 0.9


if(len(sys.argv) > 1):
    text = sys.argv[1]
    language = sys.argv[2]
    max_keywords = int(sys.argv[3])
    ngram_size = int(sys.argv[4])
    deduplication_threshold = float(sys.argv[5])


else:
    # throw error: no inputs provided
    raise Exception("No inputs provided")

#print("text: ", text)
#print("language: ", language)
#print("max keywords: ", max_keywords)
#print("ngram size: ", ngram_size)
#print("dedup thres: ", deduplication_threshold)


# Define keyword extractor object with custom options
custom_kw_extractor = yake.KeywordExtractor(
    lan=language,              # language
    n=ngram_size,                   # ngram size
    dedupLim=deduplication_threshold,          # deduplication threshold
    dedupFunc='seqm',      # deduplication function
    windowsSize=1,         # context window
    top=max_keywords,                # number of keywords to extract
    features=None          # custom features
)

keywords = custom_kw_extractor.extract_keywords(text)


for kw, score in keywords:
    print(f"{kw},{score},")






