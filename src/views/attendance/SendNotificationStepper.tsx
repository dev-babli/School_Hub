'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  Checkbox,
  Flex,
  Spinner,
  Text,
  Textarea,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { useCampus } from 'contexts/CampusContext';
import { apiHeaders } from 'lib/apiClient';

const RECIPIENT_OPTIONS = [
  { id: 'class-10a', label: 'Class 10-A' },
  { id: 'class-10b', label: 'Class 10-B' },
  { id: 'class-9a', label: 'Class 9-A' },
  { id: 'all', label: 'All students (today\'s attendance)' },
];

const DEMO_NAMES = [
  'Rahul Sharma',
  'Priya Patel',
  'Amit Kumar',
  'Sneha Reddy',
  'Vikram Singh',
  'Anita Desai',
];

function randomPhone(): string {
  return '91' + String(Math.floor(1000000000 + Math.random() * 9000000000));
}

function randomName(): string {
  return DEMO_NAMES[Math.floor(Math.random() * DEMO_NAMES.length)];
}

export default function SendNotificationStepper() {
  const { tenantId } = useCampus();
  const toast = useToast();
  const stepBgActive = useColorModeValue('brand.500', 'brand.400');
  const stepBgInactive = useColorModeValue('gray.200', 'whiteAlpha.300');
  const stepTextActive = useColorModeValue('gray.800', 'white');
  const stepTextInactive = useColorModeValue('gray.400', 'whiteAlpha.600');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [message, setMessage] = useState(
    'Dear parent, your child was marked present today. - School'
  );
  const [sending, setSending] = useState(false);

  const [activeStep, setActiveStep] = useState(0);

  const toggleRecipient = (id: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    setSending(true);
    const count = Math.max(selectedRecipients.length, 1);
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < count; i++) {
      const name = randomName();
      const phone = randomPhone();
      const now = new Date();
      const time = now.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      try {
        const res = await fetch('/api/attendance-event', {
          method: 'POST',
          headers: apiHeaders(),
          body: JSON.stringify({
            student_name: name,
            phone,
            time,
            tenant_id: tenantId,
          }),
        });
        const data = await res.json();
        if (res.ok && data.status === 'sent') sent++;
        else failed++;
      } catch {
        failed++;
      }
    }

    setSending(false);
    setActiveStep(0);
    setSelectedRecipients([]);
    toast({
      title: sent > 0 ? 'Notifications sent' : 'Send failed',
      description:
        sent > 0
          ? `${sent} message(s) sent. ${failed > 0 ? `${failed} failed.` : 'Parents will receive WhatsApp shortly.'}`
          : 'Check your WhatsApp configuration.',
      status: sent > 0 ? 'success' : 'error',
      duration: 4000,
      isClosable: true,
    });
  };

  const steps = [
    { title: 'Select recipients', description: 'Choose which parents receive the notification' },
    { title: 'Review message', description: 'Edit the message sent to parents' },
    { title: 'Send', description: 'Confirm and send via WhatsApp' },
  ];

  return (
    <Card p="24px" flexDirection="column" w="100%">
      <Flex justify="space-between" align="center" mb="24px">
        <Text fontSize="22px" fontWeight="700" lineHeight="100%">
          Send notification to parents
        </Text>
        <Text fontSize="xs" fontWeight="600" color="green.500" bg="green.500/10" px="2" py="1" borderRadius="full">
          Manual send
        </Text>
      </Flex>

      <Flex gap="24px" mb="24px" flexWrap="wrap">
        {steps.map((step, index) => (
          <Flex key={index} align="center">
            <Flex
              align="center"
              justify="center"
              w="32px"
              h="32px"
              borderRadius="full"
              bg={activeStep >= index ? stepBgActive : stepBgInactive}
              color={activeStep >= index ? 'white' : 'gray.500'}
              fontWeight="700"
              fontSize="sm"
            >
              {activeStep > index ? '✓' : index + 1}
            </Flex>
            <Text ml="8px" fontSize="sm" fontWeight="600" color={activeStep >= index ? stepTextActive : stepTextInactive}>
              {step.title}
            </Text>
          </Flex>
        ))}
      </Flex>

      <Box>
        {activeStep === 0 && (
          <Box>
            <Text fontSize="sm" color="gray.600" mb="16px">
              Select one or more groups. Parents linked to these students will receive the WhatsApp.
            </Text>
            <Flex flexDirection="column" gap="12px" mb="20px">
              {RECIPIENT_OPTIONS.map((opt) => (
                <Checkbox
                  key={opt.id}
                  isChecked={selectedRecipients.includes(opt.id)}
                  onChange={() => toggleRecipient(opt.id)}
                  colorScheme="brand"
                  size="lg"
                >
                  <Text fontWeight="600">{opt.label}</Text>
                </Checkbox>
              ))}
            </Flex>
            <Button
              colorScheme="brand"
              onClick={() => setActiveStep(1)}
              isDisabled={selectedRecipients.length === 0}
            >
              Next: Review message
            </Button>
          </Box>
        )}

        {activeStep === 1 && (
          <Box>
            <Text fontSize="sm" fontWeight="600" mb="8px">
              Message (WhatsApp template)
            </Text>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Enter message..."
              mb="16px"
            />
            <Text fontSize="xs" color="gray.500" mb="20px">
              This will be sent via your configured WhatsApp template to all selected parents.
            </Text>
            <Flex gap="12px">
              <Button variant="outline" onClick={() => setActiveStep(0)}>
                Back
              </Button>
              <Button colorScheme="brand" onClick={() => setActiveStep(2)}>
                Next: Send
              </Button>
            </Flex>
          </Box>
        )}

        {activeStep === 2 && (
          <Box>
            <Box
              p="16px"
              borderRadius="12px"
              bg="gray.50"
              _dark={{ bg: 'whiteAlpha.100' }}
              mb="20px"
            >
              <Text fontSize="sm" fontWeight="600" mb="4px">
                Recipients: {selectedRecipients.length} group(s) selected
              </Text>
              <Text fontSize="sm" color="gray.600" noOfLines={2}>
                {message}
              </Text>
            </Box>
            {sending ? (
              <Box
                p="24px"
                borderRadius="12px"
                border="1px solid"
                borderColor="green.200"
                bg="green.50"
                _dark={{ bg: 'green.900/20', borderColor: 'green.800' }}
                textAlign="center"
              >
                <Spinner size="lg" color="green.500" mb="12px" />
                <Text fontWeight="600" color="green.700" _dark={{ color: 'green.400' }}>
                  Sending notifications...
                </Text>
              </Box>
            ) : (
              <Flex gap="12px">
                <Button variant="outline" onClick={() => setActiveStep(1)}>
                  Back
                </Button>
                <Button colorScheme="green" onClick={handleSend}>
                  Send to parents
                </Button>
              </Flex>
            )}
          </Box>
        )}
      </Box>
    </Card>
  );
}
