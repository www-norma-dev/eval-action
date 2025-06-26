export default function convertJsonToMarkdownTable(
    scenarios: any[],
    results: {
      averageScores?: {
        openai?: number,
        ionos?: number,
        metadata?: number
      }
    }
  ): string {
    if (!Array.isArray(scenarios)) {
      return '❌ No scenario data available.';
    }
    const headers = [
      'Scenario',
      'GPT global average score',
      'Ionos global average score',
      'Metadata global average score',
      'GPT scenario average score',
      'Ionos scenario average score',
      'Metadata scenario average score',
    ];
  
    function scoreToEmoji(score: number | null | undefined, scale : 'llm' | 'metadata' = 'llm'): string {
      if (score == null) return "⬜";

      const percent = scale === 'llm' 
        ? (score / 3) * 100
        : score * 33.333
      
  
      if (percent < 30) return "🟥";
      if (percent <= 70) return "🟧";
      return "🟩";      
    }
  
    const rows: string[][] = [];
  
    scenarios.forEach((scenario) => {
      const scenarioName = scenario.scenarioName || scenario.name || 'Unnamed Scenario';
      const globalAverageScore = results.averageScores || {};
      const scenarioAverageScore = scenario.averageScores || {};
  
      rows.push([
        scenarioName,
        globalAverageScore.openai != null
          ? `${scoreToEmoji(globalAverageScore.openai, 'llm')} ${Math.round((globalAverageScore.openai / 3) * 100)}%`
          : '⬜',
      
        globalAverageScore.ionos != null
          ? `${scoreToEmoji(globalAverageScore.ionos, 'llm')} ${Math.round((globalAverageScore.ionos / 3) * 100)}%`
          : '⬜',
      
        globalAverageScore.metadata != null
          ? `${scoreToEmoji(globalAverageScore.metadata, 'metadata')} ${(globalAverageScore.metadata * 33.333).toFixed(0)}%`
          : '⬜',
      
        scenarioAverageScore.openai != null
          ? `${scoreToEmoji(scenarioAverageScore.openai, 'llm')} ${Math.round((scenarioAverageScore.openai / 3) * 100)}%`
          : '⬜',
      
        scenarioAverageScore.ionos != null
          ? `${scoreToEmoji(scenarioAverageScore.ionos, 'llm')} ${Math.round((scenarioAverageScore.ionos / 3) * 100)}%`
          : '⬜',
      
        scenarioAverageScore.metadata != null
          ? `${scoreToEmoji(scenarioAverageScore.metadata, 'metadata')} ${(scenarioAverageScore.metadata * 33.333).toFixed(0)}%`
          : '⬜',
      ]);
    });
      
  
    // Build the markdown array in the PR
    const markdown = [
      '| ' + headers.join(' | ') + ' |',
      '| ' + headers.map(() => '---').join(' | ') + ' |',
      ...rows.map(row => '| ' + row.map(cell => cell.toString().replace(/\n/g, ' ')).join(' | ') + ' |')
    ].join('\n');
  
    return `### Result table\n${markdown}`;
  }