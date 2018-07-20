import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { compose, withState, getContext, withHandlers } from 'recompose';
import fileSaver from 'file-saver';
import * as workpadService from '../../lib/workpad_service';
import { getWorkpad } from '../../state/selectors/workpad';
import { getId } from '../../lib/get_id';
import { WorkpadLoader as Component } from './workpad_loader';

const mapStateToProps = state => ({
  workpadId: getWorkpad(state).id,
});

export const WorkpadLoader = compose(
  getContext({
    router: PropTypes.object,
  }),
  connect(mapStateToProps),
  withState('workpads', 'setWorkpads', null),
  withHandlers({
    // Workpad creation via navigation
    createWorkpad: props => async workpad => {
      // workpad data uploaded, create and load it
      if (workpad != null) {
        await workpadService.create(workpad);
        props.router.navigateTo('loadWorkpad', { id: workpad.id, page: 1 });
        return;
      }

      props.router.navigateTo('createWorkpad');
    },

    // Workpad search
    findWorkpads: ({ setWorkpads }) => async text => {
      const workpads = await workpadService.find(text);
      setWorkpads(workpads);
    },

    // Workpad import/export methods
    downloadWorkpad: () => async workpadId => {
      const workpad = await workpadService.get(workpadId);
      const jsonBlob = new Blob([JSON.stringify(workpad)], { type: 'application/json' });
      fileSaver.saveAs(jsonBlob, `canvas-workpad-${workpad.name}-${workpad.id}.json`);
    },

    // Clone workpad given an id
    cloneWorkpad: props => async workpadId => {
      const workpad = await workpadService.get(workpadId);
      workpad.name += ' - Copy';
      workpad.id = getId('workpad');
      await workpadService.create(workpad);
      props.router.navigateTo('loadWorkpad', { id: workpad.id, page: 1 });
    },

    // Remove workpad given an id
    removeWorkpad: props => async workpadId => {
      const { setWorkpads, workpads, workpadId: loadedWorkpad } = props;

      await workpadService.remove(workpadId);

      const remainingWorkpads = workpads.workpads.filter(w => w.id !== workpadId);
      const workpadState = {
        total: remainingWorkpads.length,
        workpads: remainingWorkpads,
      };

      // load the first available workpad if the active one was removed
      if (loadedWorkpad === workpadId) {
        const nextWorkpad = workpadState.workpads[0];
        if (nextWorkpad != null) {
          props.router.navigateTo('loadWorkpad', { id: nextWorkpad.id, page: 1 });

          // update the workpad list, filtering out the removed workpad
          setWorkpads(workpadState);
        } else {
          props.router.navigateTo('home');
        }
      }
    },
  })
)(Component);
