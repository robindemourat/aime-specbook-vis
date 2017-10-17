import {csvParse} from 'd3-dsv';
import {extent} from 'd3-array';
import {scaleLinear} from 'd3-scale';

const decompose = str =>
  str
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length)
    .map(s => s.split('-').map(n => +n))

export default (md, csvStr) => {
  let statements = md.split('\n---\n')
    .map(s => s.trim())
    .filter(s => s.indexOf('Moi') === 0 || s.indexOf('Nous') === 0);
  const authors = csvParse(csvStr)
    .map(author => ({
      ...author,
      id: `${author.prenom} ${author.nom}`.toLowerCase(),
      mitigation: decompose(author.mitigation),
      desaccord: decompose(author.desaccord),
      declaration: statements.find(statement => 
        statement.toLowerCase().indexOf(`${author.prenom} ${author.nom}`.toLowerCase()) > -1
      )
    }));

  const statement = md.split('\n---\n')
      .map(s => s.trim())[0].split('\n\n');
  // remove 'Nos désaccords sur tout ce qui précède'
  statement.pop();

  const blocks = statement
      .map(block => {
        let number = block.match(/^([\d]+)./);
        number = number ? +number[1] : undefined;
        const type = block.indexOf('Moi') === 0 || block.indexOf('Nous') === 0 ? 'declaration' :
          number ? 'paragraphe': 'titre';
        return {
          content: block,
          number,
          type,
        }
      });
  return {authors, blocks}
}


export const updateBlocks = (blocks, authors, mode, filters) => {
  let auths = authors.filter(auth => filters[auth.id]);
  auths = auths.length ? auths : authors;

  const newBlocks = blocks.map(block => {
    let mitigation;
    let disagrementScore;
    let desaccord;
    if (block.number) {
      mitigation = auths.reduce((total, author) => {
        return total + author.mitigation.reduce((miniTotal, range) => {
          if (block.number >= range[0] && block.number <= range[1]) {
            return miniTotal + 1;
          }
          return miniTotal;
        }, 0);
      }, 0);
      desaccord = auths.reduce((total, author) => {
        return total + author.desaccord.reduce((miniTotal, range) => {
          if (block.number >= range[0] && block.number <= range[1]) {
            return miniTotal + 1;
          }
          return miniTotal;
        }, 0);
      }, 0);
      disagrementScore = mitigation + desaccord*2;
    }
    return {
      ...block,
      disagrementScore,
      mitigation,
      desaccord
    }
  });

  const ext = extent(newBlocks, b => b.disagrementScore);
  let range = [1, 1];
  switch (mode) {
    case 'accords':
      range = [1, 0];
      break;
    case 'desaccords':
      range = [0, 1];
      break;
    default:
      break;
  }
  const scale = scaleLinear().domain(ext).range(range);

  return newBlocks.map(block => {
    return {
      ...block,
      score: block.disagrementScore ? scale(block.disagrementScore) : 1
    }
  })
}




