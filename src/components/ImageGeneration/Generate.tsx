import {
  Center,
  Group,
  Input,
  Paper,
  Stack,
  Text,
  Accordion,
  Divider,
  Grid,
  Button,
} from '@mantine/core';
import { ModelType } from '@prisma/client';
import { IconBook2 } from '@tabler/icons-react';
import { z } from 'zod';
import { ClearableNumberInput } from '~/components/ClearableNumberInput/ClearableNumberInput';
import { CheckpointSelect } from '~/components/ImageGeneration/GenerationForm/GenerationResourceSelect';
import MentionExample from '~/components/ImageGeneration/SlateEditor/SlateEditor';
import { useImageGenerationStore } from '~/components/ImageGeneration/hooks/useImageGenerationState';
import {
  Form,
  InputNumber,
  InputSegmentedControl,
  InputSelect,
  InputTextArea,
  useForm,
} from '~/libs/form';
import { generationParamsSchema } from '~/server/schema/generation.schema';
import { Generation } from '~/server/services/generation/generation.types';
import { trpc } from '~/utils/trpc';

const resourceSchema = z
  .object({
    id: z.number(),
    modelType: z.nativeEnum(ModelType),
    strength: z.number().optional(),
  })
  .passthrough();

const schema = generationParamsSchema.extend({
  model: resourceSchema.array().max(1),
  additionalResources: resourceSchema.array().default([]),
  aspectRatio: z.string(),
});

export function Generate({
  request,
  onSuccess,
}: {
  request?: Generation.Client.Request;
  onSuccess?: () => void;
}) {
  const defaultValues = {
    model: [request?.resources.find((x) => x.modelType === ModelType.Checkpoint)],
    ...request?.params,
  };
  const setRequests = useImageGenerationStore((state) => state.setRequests);
  const form = useForm({ schema, defaultValues: defaultDemoValues });
  const { mutate, isLoading } = trpc.generation.createRequest.useMutation({
    onSuccess: (data) => {
      setRequests([data]);
      onSuccess?.();
    },
  });

  // TODO - something something `useFormStorage`

  return (
    <Form
      form={form}
      onSubmit={(values) => {
        const [width, height] = values.aspectRatio.split('x');
        mutate({
          height: Number(height),
          width: Number(width),
          resources: [...values.model, ...values.additionalResources].map((resource) => ({
            modelVersionId: resource.id,
            type: resource.modelType,
            strength: resource.strength,
          })),
          prompt: values.prompt,
          negativePrompt: values.negativePrompt,
          cfgScale: values.cfgScale,
          sampler: values.sampler,
          steps: values.steps,
          seed: values.seed,
          clipSkip: values.clipSkip,
          quantity: values.quantity,
        });
      }}
    >
      <Stack>
        <CheckpointSelect
          label="Model"
          name="model"
          required
          limit={1}
          types={[ModelType.Checkpoint]}
        />
        <CheckpointSelect
          label="Additional Resources"
          name="additionalResources"
          required
          notTypes={[ModelType.Checkpoint]}
        />

        <Input.Wrapper
          labelProps={{ sx: { width: '100%' } }}
          label={
            <Group position="apart">
              Prompt
              {/* <Text variant="link">
                <Group align="center" spacing={4}>
                  <span>From Collection</span> <IconBook2 size={16} />
                </Group>
              </Text> */}
            </Group>
          }
        >
          <InputTextArea name="prompt" autosize />
          <InputTextArea name="negativePrompt" autosize />
          {/* <MentionExample value={prompt} /> */}
        </Input.Wrapper>
        <Stack spacing={0}>
          <Input.Label>Aspect Ratio</Input.Label>
          <InputSegmentedControl name="aspectRatio" data={aspectRatioControls} />
        </Stack>

        {/* ADVANCED */}
        <Accordion variant="separated">
          <Accordion.Item value="advanced">
            <Accordion.Control>
              <Divider label="Advanced" labelPosition="left" labelProps={{ size: 'md' }} />
            </Accordion.Control>
            <Accordion.Panel>
              <Stack>
                <InputNumber name="cfgScale" label="Creativity (CFG Scale)" step={0.5} />
                <InputSelect name="sampler" label="Engine (Sampler)" data={allSamplers} />
                <InputNumber name="steps" label="Quality (Steps)" />
                {/* <Stack spacing={0}>
                  <Input.Label>Creativity (CFG Scale)</Input.Label>
                  <SegmentedControl data={cfgScales} />
                </Stack>
                <Stack spacing={0}>
                  <Input.Label>Engine (Sampler)</Input.Label>
                  <SegmentedControl data={samplers} />
                </Stack>
                <Stack spacing={0}>
                  <Input.Label>Quality (Steps)</Input.Label>
                  <SegmentedControl data={steps} />
                </Stack> */}
                <Grid>
                  <Grid.Col span={6}>
                    <InputNumber name="seed" label="Seed" placeholder="Random" min={0} />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <InputNumber name="clipSkip" label="Clip Skip" min={0} max={10} />
                  </Grid.Col>
                </Grid>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>

        <InputNumber name="quantity" label="Quantity" />
        <Group>
          <Button onClick={() => form.reset()} variant="default">
            Reset
          </Button>
          <Button type="submit" loading={isLoading}>
            Go
          </Button>
        </Group>
        {/* TODO.Quantity,Go */}
      </Stack>
    </Form>
  );
}

const aspectRatioDetails = [
  { label: 'Square', width: 512, height: 512 },
  { label: 'Landscape', width: 768, height: 512 },
  { label: 'Portrait', width: 512, height: 768 },
];
const aspectRatioControls = aspectRatioDetails.map(({ label, width, height }) => ({
  label: (
    <Stack spacing={4} py="xs">
      <Center>
        <Paper withBorder sx={{ borderWidth: 2, aspectRatio: `${width}/${height}`, height: 30 }} />
      </Center>
      {label}
    </Stack>
  ),
  value: `${width}x${height}`,
}));

const cfgScales = [
  { label: 'Creative', value: '4' },
  { label: 'Balanced', value: '7' },
  { label: 'Precise', value: '10' },
];

const samplers = [
  { label: 'Fast', value: 'Euler A' },
  { label: 'Popular', value: 'DPM++ 2M Karras' },
  { label: 'Quality', value: 'DPM++ SDE Karras' },
];

const allSamplers = [
  'Euler a',
  'Euler',
  'LMS',
  'Heun',
  'DPM2',
  'DPM2 a',
  'DPM++ 2S a',
  'DPM++ 2M',
  'DPM++ SDE',
  'DPM fast',
  'DPM adaptive',
  'LMS Karras',
  'DPM2 Karras',
  'DPM2 a Karras',
  'DPM++ 2S a Karras',
  'DPM++ 2M Karras',
  'DPM++ SDE Karras',
  'DDIM',
  'PLMS',
  'UniPC',
];

const steps = [
  { label: 'Fast', value: '10' },
  { label: 'Balanced', value: '20' },
  { label: 'High', value: '30' },
];

// #region [developement]
const defaultDemoValues = {
  prompt:
    'close up photo of a rabbit, forest, haze, halation, bloom, dramatic atmosphere, centred, rule of thirds, 200mm 1.4f macro shot',
  negativePrompt:
    '(semi-realistic, cgi, 3d, render, sketch, cartoon, drawing, anime:1.4), text, close up, cropped, out of frame, worst quality, low quality, jpeg artifacts, ugly, duplicate, morbid, mutilated, extra fingers, mutated hands, poorly drawn hands, poorly drawn face, mutation, deformed, blurry, dehydrated, bad anatomy, bad proportions, extra limbs, cloned face, disfigured, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, fused fingers, too many fingers, long neck',
  cfgScale: 7,
  steps: 25,
  sampler: 'Euler a',
  seed: 2299724292,
  aspectRatio: '768x512',
  quantity: 2,
  clipSkip: 1,
  model: [
    {
      id: 29460,
      name: 'V2.0',
      trainedWords: ['analog style', 'modelshoot style', 'nsfw', 'nudity'],
      modelId: 4201,
      modelName: 'Realistic Vision V2.0',
      modelType: ModelType.Checkpoint,
    },
  ],
};
// #endregion
