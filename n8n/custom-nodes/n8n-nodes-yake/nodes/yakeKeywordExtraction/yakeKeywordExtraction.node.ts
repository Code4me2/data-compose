import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeConnectionType,
} from 'n8n-workflow';
import {spawnSync} from 'child_process'

export class yakeKeywordExtraction implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Keyword Extraction',
    name: 'keyword_extraction',
    group: ['transform'],
    version: 1,
    description: 'Extract keywords from text with Yet Another Keyword Extractor',
    defaults: {
      name: 'Keyword Extractor',
    },
    inputs: [NodeConnectionType.Main],
    outputs: [NodeConnectionType.Main],
    properties: [
      {
        displayName: 'Input Text',
        name: 'inputText',
        type: 'string',
        default: 'your text here',
        description: 'Text to be analyzed',
      },
      {
        displayName: 'Language',
        name: 'language',
        type: 'string',
        default: 'en',
        description: 'Language of input document',
      },
      {
        displayName: 'Max Keywords',
        name: 'maxKeywords',
        type: 'number',
        default: 20,
        description: 'Maximum number of keywords to extract from a document',
      },
      {
        displayName: 'N-gram size',
        name: 'ngramSize',
        type: 'number',
        default: 3,
        description: 'Maximum size of the ngram',
      },
      {
        displayName: 'Deduplication threshold',
        name: 'deduplicationThreshold',
        type: 'number',
        default: 0.9,
        description: 'Deduplication threshold',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {

      // get user-entered values from the n8n node interface, that we set up just above
      const language = this.getNodeParameter('language', i) as string;
      const maxKeywords = this.getNodeParameter('maxKeywords', i) as number;
      const ngramSize = this.getNodeParameter('ngramSize', i) as number;
      const deduplicationThreshold = this.getNodeParameter('deduplicationThreshold', i) as number;
      
      const input_text = this.getNodeParameter('inputText', i) as string;
       
    
      // enclose the main bits of code in a try/catch just in case
      try {


        // now we process the document with YAKE

        // this lets us use an array of tuples to have the keyword and its accuracy score in one array value
        type keyword_with_score = [string, number];
        let keywords_with_score: keyword_with_score[] = [];

        // initialize the rest of the variables
        let keywords: string[] = [];
        let dirty_keywords: string[] = [];
        let raw_keywords = '';
        

        // path to the python script that runs YAKE
        const script_path = './run_YAKE.py'

        // spawn a child process to run the python script with all the user inputs
        const pythonProcess = spawnSync('python', [script_path, input_text.toString(), language, maxKeywords.toString(), ngramSize.toString(), deduplicationThreshold.toString()]);
      
        
        // Capture stdout (the keywords that the script returns) and then format it into utf-8 text
        const stringDecoder = new TextDecoder('utf-8');
        raw_keywords = stringDecoder.decode(pythonProcess.stdout)

        // remove the last character (a comma) from the output so you don't get left with an empty array value
        raw_keywords = raw_keywords.slice(0,-1);

        // remove all newline characters
        raw_keywords = raw_keywords.replaceAll("\n", "");
        raw_keywords = raw_keywords.replaceAll("\r", "");

        // turn the string into an array, with values separated by commas
        dirty_keywords = raw_keywords.split(',');


        let temp_str = '';
        let counter = 0;
        // construct the two arrays to return, one with just all the keywords, and one with keywords and their matching accuracy value in a tuple (ie. [[keyword1, 0.01233], [keyword2, 0.05678], [string, float], etc])
        for(const str of dirty_keywords){
          // even indicies are the keywords (ie. [word1, 0.051, word2, 0.062, etc])
            if(counter % 2 == 0){
              keywords.push(str);
              temp_str = str;
            }
            else{
              keywords_with_score.push([temp_str, parseFloat(str)]);

            }
            counter++;
        }

        //console.log('keywords clean: ', keywords);
        //console.log('keywords with score: ', keywords_with_score);



        // update the data we're returning to include the keywords data we got from YAKE
        returnData.push({
                  json: {
                    keywords: keywords,
                    keywords_with_score: keywords_with_score
                  },
                });


      // throw an error and stop if something goes wrong
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Failed to process document: ${error.message}`);
        }
        throw error;
      }
    }


    return [returnData];
    
  }
}


