import React, { Component } from 'react';
import Md from 'react-markdown';
import {RadioGroup, Radio} from 'react-radio-group';
import Collapsible from 'react-collapsible';
import {scaleLinear} from 'd3-scale';

import './App.css';

import ratifications from './data/specbook.csv';
import specbook from './data/specbook.md';

import prepareData, {updateBlocks} from './helpers/prepareData';

const scale = scaleLinear().domain([0, 1]);

const Block = ({
  block,
  mode = 'original',
  materializationStyle = 'opacity',
  onMouseClick,
  activeNumber
}) => {
  const style = {};
  if (mode !== 'original' && materializationStyle === 'opacity' || materializationStyle === 'size-opacity') {
    style.opacity = scale.range([.2, 1])(block.score)
  } 
  if (mode !== 'original' && materializationStyle === 'color') {
    style.color = scale.range(['#e4572d', '#20b2aa'])(block.score)
  } 
  if(mode !== 'original' && materializationStyle === 'size' || materializationStyle === 'size-opacity') {
    style.fontSize = scale.range(['.5', '1'])(block.score) + 'em'
  }
  const active = activeNumber && block.number && activeNumber === block.number;
  return (
    <div 
      style={style} 
      className={'block ' + (active ? 'active' : '')}
      onClick={e => {
        e.stopPropagation();
        onMouseClick(block.number)
      }}
    >
      <Md source={block.content.trim()} />
    </div>
  )
};

const Author = ({
  author,
  onOpen,
  onClose
}) => {
  return (
    <Collapsible 
      trigger={`${author.prenom} ${author.nom}`}
      onClosing={() => onClose(author.id)}
      onOpening={() => onOpen(author.id)}
      className={'author ' + (author.status || '')}
    >
      <h4 className="declaration-title">Déclaration</h4>
      <Md source={author.declaration} className="declaration" />
    </Collapsible>
  )
}

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: undefined,
      mode: 'original',
      filter: {},
      materializationStyle: 'color'
    };

  }
  componentDidMount() {
    fetch(specbook)
    .then(response => response.text())
    .then(md => {
      fetch(ratifications)
        .then(response => response.text())
        .then(csv => {
          const data = prepareData(md, csv);
          this.setState({data})
        })
    });
  }

  onModeChange = mode => {
    this.setState({mode});
  }

  onMaterializationStyleChange = materializationStyle => {
    this.setState({materializationStyle});
  }

  addFilter = id => {
    this.setState({
      filter: {
        ...this.state.filter,
        [id]: true
      }
    })
  }

  removeFilter = id => {
    this.setState({
      filter: {
        ...this.state.filter,
        [id]: undefined
      }
    })
  }

  onBlockClick = inputNumber => {
    let number = inputNumber;
    // toggle behavior
    if (number && this.state.activeNumber === number) {
      number = undefined;
    }
    if (number !== undefined) {
      this.setState({
        activeNumber: number,
        data: {
          ...this.state.data,
          authors: this.state.data.authors.map(author => {
            let status;
            const mitige = author.mitigation.find(range => {
              if (number >= range[0] && number <= range[1]) {
                return true;
              }
            });
            if (mitige) {
              return {
                ...author,
                status: 'mitige'
              }
            }
            
            const padaccord = author.desaccord.find(range => {
              if (number >= range[0] && number <= range[1]) {
                return true;
              }
            });
            return {
              ...author,
              status: padaccord !== undefined ? 'desaccord': 'accord',
            };
          })
        }
      })
    } else {
      this.setState({
        activeNumber: number,
        data: {
          ...this.state.data,
          authors: this.state.data.authors.map(author => ({
            ...author,
            status: undefined,
          }))
        }
      });
    }
  }

  render() {
    const {
      state: {
        data,
        mode,
        filter,
        materializationStyle,
        activeNumber
      },
      onModeChange,
      onMaterializationStyleChange,
      addFilter,
      removeFilter,
      onBlockClick,
    } = this;

    const blocks = data && data.blocks && updateBlocks(data.blocks, data.authors, mode, filter);
    return (
      <div className="App">
        <aside>
          <div className="aside-header">
            <h1 className="title"><a href="https://docs.google.com/document/d/18fFz3_ICixomjd8Wh6XNUzowzq2KNPRzPGrAhQVvIio/edit?usp=sharing" target="blank">Specbook</a> <a href="http://modesofexistence.org/" target="blank">EME</a> - visualisation des désaccords</h1>
            <p>
              <i>Ouvrir la déclaration attachée à un (ou plusieurs) auteur(s) pour voir le texte de son/leur point de vue.</i>
            </p>
          </div>
          {
            data && data.authors ?
            <div className="authors">
              {
                data.authors.map((author, index) => (
                  <Author onOpen={addFilter} onClose={removeFilter} key={index} author={author}/>
                ))
              }
            </div>
            : <div className="loading">Chargement</div>
          }
        </aside>
        <section id="main">
          {blocks ? 
            <section id="report">
              {
                blocks
                .map((block, index) => <Block 
                  block={block} 
                  mode={mode}
                  key={index} 
                  materializationStyle={materializationStyle}
                  onMouseClick={onBlockClick}
                  activeNumber={activeNumber}
                />)
              }
            </section> 
            : <section className="loading">Chargement</section>
          }
        </section>

        {
          blocks ? 
            <section id="aside-right">
              <section id="mini-report">
                {
                  blocks
                  .map((block, index) => <Block 
                    block={block} 
                    mode={mode}
                    key={index} 
                    materializationStyle={materializationStyle}
                    onMouseClick={onBlockClick}
                    activeNumber={activeNumber}
                  />)
                }
              </section> 
              <div id="controls">
                  <p>
                    <i>
                      Cliquez sur un paragraphe pour voir qui a exprimé des désaccords à son propos.
                    </i>
                  </p>
                  <RadioGroup name="mode" selectedValue={mode} onChange={onModeChange}>
                    <li><Radio value="original" />Texte original</li>
                    <li><Radio value="accords" />Matérialiser les accords</li>
                    <li><Radio value="desaccords" />Matérialiser les désaccords</li>
                  </RadioGroup>
                  {mode !== 'original' && <RadioGroup name="materializationStyle" selectedValue={materializationStyle} onChange={onMaterializationStyleChange}>
                    <li><Radio value="color" />Couleur</li>
                    <li><Radio value="opacity" />Opacité</li>
                    <li><Radio value="size" />Taille</li>
                    <li><Radio value="size-opacity" />Opacité et taille</li>
                  </RadioGroup>}
              </div>
            </section>
            : <section className="loading">Chargement</section>
          }
      </div>
    );
  }
}

export default App;
