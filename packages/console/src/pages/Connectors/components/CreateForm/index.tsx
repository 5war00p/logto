import { ConnectorType } from '@logto/schemas';
import classNames from 'classnames';
import { useMemo, useState } from 'react';
import Modal from 'react-modal';

import Button from '@/components/Button';
import ModalLayout from '@/components/ModalLayout';
import RadioGroup, { Radio } from '@/components/RadioGroup';
import UnnamedTrans from '@/components/UnnamedTrans';
import useConnectorGroups from '@/hooks/use-connector-groups';
import * as modalStyles from '@/scss/modal.module.scss';

import Guide from '../Guide';
import PlatformSelector from './PlatformSelector';
import * as styles from './index.module.scss';

type Props = {
  isOpen: boolean;
  type?: ConnectorType;
  onClose?: (connectorId?: string) => void;
};

const CreateForm = ({ onClose, isOpen: isFormOpen, type }: Props) => {
  const { data: allGroups, connectors, error } = useConnectorGroups();
  const isLoading = !allGroups && !connectors && !error;
  const [activeGroupId, setActiveGroupId] = useState<string>();
  const [activeConnectorId, setActiveConnectorId] = useState<string>();
  const [isGetStartedModalOpen, setIsGetStartedModalOpen] = useState(false);

  const groups = useMemo(
    () => allGroups?.filter((group) => group.type === type),
    [allGroups, type]
  );

  const activeGroup = useMemo(
    () => groups?.find(({ id }) => id === activeGroupId),
    [activeGroupId, groups]
  );

  const activeConnector = useMemo(
    () => connectors?.find(({ id }) => id === activeConnectorId),
    [activeConnectorId, connectors]
  );

  const cardTitle = useMemo(() => {
    if (type === ConnectorType.Email) {
      return 'connectors.setup_title.email';
    }

    if (type === ConnectorType.Sms) {
      return 'connectors.setup_title.sms';
    }

    return 'connectors.setup_title.social';
  }, [type]);

  const handleGroupChange = (groupId: string) => {
    if (!groups) {
      return;
    }

    setActiveGroupId(groupId);

    const group = groups.find(({ id }) => id === groupId);

    if (!group) {
      return;
    }

    const firstAvailableConnector = group.connectors.find(({ enabled }) => !enabled);

    setActiveConnectorId(firstAvailableConnector?.id);
  };

  const closeModal = () => {
    setIsGetStartedModalOpen(false);
    onClose?.(activeConnectorId);
    setActiveGroupId(undefined);
    setActiveConnectorId(undefined);
  };

  const modalSize = useMemo(() => {
    if (!groups || groups.length <= 2) {
      return 'medium';
    }

    if (groups.length === 3) {
      return 'large';
    }

    return 'xlarge';
  }, [groups]);

  return (
    <Modal
      isOpen={isFormOpen}
      className={modalStyles.content}
      overlayClassName={modalStyles.overlay}
    >
      <ModalLayout
        title={cardTitle}
        footer={
          <Button
            title="general.next"
            type="primary"
            disabled={!activeConnectorId}
            onClick={() => {
              setIsGetStartedModalOpen(true);
            }}
          />
        }
        className={styles.body}
        size={modalSize}
        onClose={onClose}
      >
        {isLoading && 'Loading...'}
        {error?.message}
        {groups && (
          <RadioGroup
            name="group"
            value={activeGroupId}
            type="card"
            className={classNames(styles.connectorGroup, styles[modalSize])}
            onChange={handleGroupChange}
          >
            {groups.map(({ id, name, logo, description, connectors }) => {
              const isDisabled = connectors.every(({ enabled }) => enabled);

              return (
                <Radio key={id} value={id} isDisabled={isDisabled} disabledLabel="general.added">
                  <div className={styles.connector}>
                    <div className={styles.logo}>
                      <img src={logo} alt="logo" />
                    </div>
                    <div className={styles.content}>
                      <div
                        className={classNames(
                          styles.name,
                          isDisabled && styles.nameWithRightPadding
                        )}
                      >
                        <UnnamedTrans resource={name} />
                      </div>
                      <div className={styles.description}>
                        <UnnamedTrans resource={description} />
                      </div>
                    </div>
                  </div>
                </Radio>
              );
            })}
          </RadioGroup>
        )}
        {activeGroup && (
          <PlatformSelector
            connectorGroup={activeGroup}
            connectorId={activeConnectorId}
            onConnectorIdChange={setActiveConnectorId}
          />
        )}
        {activeConnector && (
          <Modal isOpen={isGetStartedModalOpen} className={modalStyles.fullScreen}>
            <Guide connector={activeConnector} onClose={closeModal} />
          </Modal>
        )}
      </ModalLayout>
    </Modal>
  );
};

export default CreateForm;
