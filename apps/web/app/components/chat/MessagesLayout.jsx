'use client';

import Icon from '../Icon';
import PageHeader from '../PageHeader';
import ConversationList from './ConversationList';
import ConversationView from './ConversationView';

/**
 * Mise en page de /messages (présentation pure) : assemble la liste et la
 * conversation ouverte.
 * - < md : un seul écran à la fois — la liste, ou la conversation en plein
 *   écran (par-dessus la barre d'onglets, comme l'écran poussé du mobile) ;
 * - ≥ md : deux colonnes, liste à gauche, conversation à droite.
 *
 * @param {Object} props
 * @param {Object} props.list  Props de ConversationList (voir son contrat). `selectedId` est renseigné ici.
 * @param {Object|null} [props.conversation]  Props de ConversationView (voir son contrat) + `id` de la
 *        conversation ouverte ; null = aucune conversation ouverte.
 */
export default function MessagesLayout({ list, conversation = null }) {
  const open = !!conversation;
  const twoPane = open || list.loading || (list.conversations || []).length > 0;

  return (
    <main
      className={`mx-auto flex w-full flex-1 flex-col px-4 pt-6 sm:px-6 ${
        twoPane
          ? 'max-w-5xl md:h-[calc(100dvh-65px)] md:flex-none md:flex-row md:gap-6 md:py-6'
          : 'max-w-xl md:pt-10'
      }`}
    >
      <div
        className={`min-w-0 flex-col ${open ? 'hidden md:flex' : 'flex'} ${
          // -m-1 p-1 : la colonne défile, les anneaux de focus ne doivent pas être rognés.
          twoPane ? 'md:-m-1 md:w-80 md:shrink-0 md:overflow-y-auto md:p-1 lg:w-96' : ''
        }`}
      >
        <PageHeader title="Messages" subtitle="Tes conversations avec tes matchs" />
        <ConversationList {...list} selectedId={conversation?.id ?? null} />
      </div>

      {twoPane && (
        <div className={`min-w-0 flex-1 flex-col ${open ? 'flex' : 'hidden md:flex'}`}>
          {open ? (
            // key : brouillon et position de défilement repartent de zéro
            // quand on change de conversation.
            <ConversationView key={conversation.id} {...conversation} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 rounded-card border border-dashed border-line px-6 text-center">
              <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-2xl bg-accent/15 text-accent-text">
                <Icon name="chat" className="size-7" />
              </span>
              <div className="flex max-w-xs flex-col gap-2">
                <h2 className="text-xl font-semibold tracking-tight text-fg">Choisis une conversation</h2>
                <p className="text-sm leading-relaxed text-muted">
                  Les messages s&apos;effacent 24 h après leur envoi : profite de l&apos;instant.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
