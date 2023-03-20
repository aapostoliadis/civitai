import { ModelWizard } from '~/components/Resource/Wizard/ModelWizard';
import { dbRead } from '~/server/db/client';
import { createServerSideProps } from '~/server/utils/server-side-helpers';
import { isNumber } from '~/utils/type-guards';

export const getServerSideProps = createServerSideProps({
  useSSG: true,
  prefetch: 'always',
  resolver: async ({ ctx, ssg, session }) => {
    const params = ctx.params as { id?: string };
    if (!session)
      return {
        redirect: {
          destination: `/models/v2/${params.id}`,
          permanent: false,
        },
      };

    const id = Number(params.id);
    if (!isNumber(id)) return { notFound: true };

    const model = await dbRead.model.findUnique({ where: { id }, select: { userId: true } });
    if (!model) return { notFound: true };

    const isOwner = model.userId === session.user?.id;
    const isModerator = session.user?.isModerator ?? false;
    if (!isOwner && !isModerator)
      return {
        redirect: {
          destination: `/models/v2/${params.id}`,
          permanent: false,
        },
      };

    await ssg?.model.getById.prefetch({ id });
  },
});

export default function ModelEdit() {
  return <ModelWizard />;
}

ModelEdit.getLayout = (page: React.ReactElement) => <>{page}</>;
