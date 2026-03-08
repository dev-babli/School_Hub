// Chakra imports
import { Flex, Text, useColorModeValue, HStack } from '@chakra-ui/react';
import { Icon } from '@chakra-ui/react';
import { MdSchool } from 'react-icons/md';

// Custom components
import { HSeparator } from 'components/separator/Separator';

export function SidebarBrand() {
	let logoColor = useColorModeValue('navy.700', 'white');

	return (
		<Flex alignItems='center' flexDirection='column'>
			<HStack spacing='2' my='32px'>
				<Icon as={MdSchool} w='28px' h='28px' color='brand.500' />
				<Text fontSize='xl' fontWeight='700' color={logoColor}>
					SchoolHub
				</Text>
				<Text fontSize='sm' fontWeight='500' color='gray.500'>V 1.0</Text>
			</HStack>
			<HSeparator mb='20px' />
		</Flex>
	);
}

export default SidebarBrand;
