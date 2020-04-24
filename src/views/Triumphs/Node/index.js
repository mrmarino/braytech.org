import React from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import cx from 'classnames';

import manifest from '../../../utils/manifest';
import duds from '../../../data/records/duds';
import unobtainable from '../../../data/records/unobtainable';
import { enumerateRecordState } from '../../../utils/destinyEnums';
import { ProfileNavLink } from '../../../components/ProfileLink';
import ObservedImage from '../../../components/ObservedImage';
import Records from '../../../components/Records';

class PresentationNode extends React.Component {
  render() {
    const { member, collectibles } = this.props;
    const characterRecords = member.data.profile.characterRecords.data;
    const profileRecords = member.data.profile.profileRecords.data.records;

    const primaryHash = this.props.match.params.primary;
    const definitionPrimary = (manifest.DestinyPresentationNodeDefinition[primaryHash] && manifest.DestinyPresentationNodeDefinition[primaryHash].children.presentationNodes.length && manifest.DestinyPresentationNodeDefinition[primaryHash]) || manifest.DestinyPresentationNodeDefinition[4230728762];

    if (!definitionPrimary) {
      return null;
    }

    const secondaryHash = this.props.match.params.secondary || definitionPrimary.children.presentationNodes[0].presentationNodeHash;
    const definitionSecondary = manifest.DestinyPresentationNodeDefinition[secondaryHash];

    const tertiaryHash = this.props.match.params.tertiary || definitionSecondary.children.presentationNodes[0].presentationNodeHash;
    const definitionTertiary = manifest.DestinyPresentationNodeDefinition[tertiaryHash];

    const quaternaryHash = this.props.match.params.quaternary;

    const primaryChildren = [];
    definitionPrimary.children.presentationNodes.forEach((child) => {
      const definitionNode = manifest.DestinyPresentationNodeDefinition[child.presentationNodeHash];

      const isActive = (match, location) => {
        if (this.props.match.params.secondary === undefined && definitionPrimary.children.presentationNodes.indexOf(child) === 0) {
          return true;
        } else if (match) {
          return true;
        } else {
          return false;
        }
      };

      primaryChildren.push(
        <li key={definitionNode.hash} className='linked'>
          <ProfileNavLink isActive={isActive} to={`/triumphs/${primaryHash}/${definitionNode.hash}`}>
            <ObservedImage className={cx('image', 'icon')} src={`https://www.bungie.net${definitionNode.displayProperties.icon}`} />
          </ProfileNavLink>
        </li>
      );
    });

    const secondaryChildren = [];
    definitionSecondary.children.presentationNodes.forEach((child) => {
      const definitionNode = manifest.DestinyPresentationNodeDefinition[child.presentationNodeHash];

      if (definitionNode.redacted) {
        return;
      }

      const states = definitionNode.children.records
        .map((record) => {
          const definitionRecord = manifest.DestinyRecordDefinition[record.recordHash];
          const scopeRecord = definitionRecord.scope || 0;
          const recordData = scopeRecord === 1 ? characterRecords[member.characterId].records[definitionRecord.hash] : profileRecords[definitionRecord.hash];

          // skip hardcoded duds
          if (collectibles.hideDudRecords && duds.indexOf(record.recordHash) > -1) return false;

          // skip hardcoded unobtainables
          if (recordData.intervalObjectives?.length) {
            if (collectibles.hideUnobtainableRecords && recordData.intervalsRedeemedCount === 0 && unobtainable.indexOf(record.recordHash) > -1) return false;
          } else {
            if (collectibles.hideUnobtainableRecords && !enumerateRecordState(recordData.state).recordRedeemed && unobtainable.indexOf(record.recordHash) > -1) return false;
          }

          // skip those with the state of...
          if (collectibles.hideInvisibleRecords && (enumerateRecordState(recordData.state).obscured || enumerateRecordState(recordData.state).invisible)) return false;

          return recordData;
        })
        .filter((record) => record);

      const isActive = (match, location) => {
        if (this.props.match.params.tertiary === undefined && definitionSecondary.children.presentationNodes.indexOf(child) === 0) {
          return true;
        } else if (match) {
          return true;
        } else {
          return false;
        }
      };

      const secondaryProgress = states.filter((record) => enumerateRecordState(record.state).recordRedeemed).length;
      const secondaryTotal = collectibles && collectibles.hideInvisibleRecords ? states.filter((record) => !enumerateRecordState(record.state).invisible).length : states.length;

      if (secondaryTotal === 0) {
        return;
      }

      secondaryChildren.push(
        <li key={definitionNode.hash} className={cx('linked', { completed: secondaryProgress === secondaryTotal && secondaryTotal !== 0, active: definitionTertiary.hash === child.presentationNodeHash })}>
          <div className='text'>
            <div className='name'>{definitionNode.displayProperties.name}</div>
            <div className='progress'>
              <span>{secondaryProgress}</span> / {secondaryTotal}
            </div>
          </div>
          <ProfileNavLink isActive={isActive} to={`/triumphs/${primaryHash}/${secondaryHash}/${definitionNode.hash}`} />
        </li>
      );
    });

    const recordHashes = definitionTertiary.children.records
      .filter((record) => {
        const definitionRecord = manifest.DestinyRecordDefinition[record.recordHash];
        const scopeRecord = definitionRecord.scope || 0;
        const recordData = scopeRecord === 1 ? characterRecords[member.characterId].records[definitionRecord.hash] : profileRecords[definitionRecord.hash];

        if (collectibles.hideDudRecords && duds.indexOf(record.recordHash) > -1) return false;
        if (recordData.intervalObjectives?.length) {
          if (recordData.intervalsRedeemedCount === 0 && collectibles.hideUnobtainableRecords && unobtainable.indexOf(record.recordHash) > -1) return false;
        } else {
          if (!enumerateRecordState(recordData.state).recordRedeemed && collectibles.hideUnobtainableRecords && unobtainable.indexOf(record.recordHash) > -1) return false;
        }
        if (collectibles.hideInvisibleRecords && (enumerateRecordState(recordData.state).obscured || enumerateRecordState(recordData.state).invisible)) return false;

        return true;
      })
      .map((record) => record.recordHash);

    return (
      <div className='node'>
        <div className='header'>
          <div className='name'>
            {definitionPrimary.displayProperties.name}
            {definitionPrimary.children.presentationNodes.length > 1 ? <span>{definitionSecondary.displayProperties.name}</span> : null}
          </div>
        </div>
        <div className='children'>
          <ul
            className={cx('list', 'primary', {
              'single-primary': definitionPrimary.children.presentationNodes.length === 1,
            })}
          >
            {primaryChildren}
          </ul>
          <ul className='list secondary'>{secondaryChildren}</ul>
        </div>
        <div className='entries'>
          <ul className='list tertiary record-items'>
            <Records hashes={recordHashes} highlight={quaternaryHash} readLink={primaryHash === '564676571'} />
          </ul>
        </div>
      </div>
    );
  }
}

function mapStateToProps(state, ownProps) {
  return {
    member: state.member,
    collectibles: state.collectibles,
  };
}

export default compose(withRouter, connect(mapStateToProps))(PresentationNode);
