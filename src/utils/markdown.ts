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
  
    function scoreToEmoji(score: number | null | undefined): string {
      if (score == null) return "⬜";
      const percent = score * 20;
  
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
        globalAverageScore.openai != null ? `${scoreToEmoji(globalAverageScore.openai)} ${(globalAverageScore.openai * 20).toFixed(2)}%` : '⬜',
        globalAverageScore.ionos != null ? `${scoreToEmoji(globalAverageScore.ionos)} ${(globalAverageScore.ionos * 20).toFixed(2)}%` : '⬜',
        globalAverageScore.metadata != null ? `${scoreToEmoji(globalAverageScore.metadata)} ${(globalAverageScore.metadata * 20).toFixed(2)}%` : '⬜',
        scenarioAverageScore.openai != null ? `${scoreToEmoji(scenarioAverageScore.openai)} ${(scenarioAverageScore.openai * 20).toFixed(2)}%`: '⬜',
        scenarioAverageScore.ionos != null ? `${scoreToEmoji(scenarioAverageScore.ionos)} ${(scenarioAverageScore.ionos * 20).toFixed(2)}%`: '⬜',
        scenarioAverageScore.metadata != null ? `${scoreToEmoji(scenarioAverageScore.metadata)} ${(scenarioAverageScore.metadata * 20).toFixed(2)}%`: '⬜',
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