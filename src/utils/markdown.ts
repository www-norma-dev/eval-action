/**
 * This code enables users to see average scores per scenario.
 * @param scenarios 
 * @returns a markdown table 
 */

export default function convertJsonToMarkdownTable(
    scenarios: any[],
  ): string {
    if (!Array.isArray(scenarios)) {
      return '❌ No scenario data available.';
    }
    const headers = [
      'Scenario name',
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
      const scenarioAverageScore = scenario.averageScores || {};
  
      rows.push([
        scenarioName,
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